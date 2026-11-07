import tl = require('azure-pipelines-task-lib/task');
import process = require('process')
var fs = require('fs');
var path = require('path');

async function run() {
    try {

        const endpointId = tl.getInputRequired("dockerRegistryEndpoint");
        const endpointAuth = tl.getEndpointAuthorization(endpointId, false);
        if (!endpointAuth) {
            throw new Error(`no authorization for docker registry endpoint ${endpointId}`);
        }
        const registryEndpoint = endpointAuth.parameters;

        const dockerAmd64 = tl.getPathInputRequired("dockerfile_amd64");
        const dockerArm32 = tl.getPathInput("dockerfile_arm32", false);
        const imageName = tl.getInputRequired("imageName");

        const buildArgs = tl.getInput("buildArgs", false);
        const version = tl.getInputRequired("version");
        const buildVersion = tl.getInput("buildVersion", false) || version;
        const cloudPublish = tl.getBoolInput("cloud_publish", false) ?? false;

        let branch = tl.getVariable("Build.SourceBranchName") ?? "";
        const production = branch === "main" || branch === "master";

        // the cloud key is passed to the build as BuildKit secret (RUN --mount=type=secret,id=cloud_api_key):
        // build args end up in the image history, secrets do not
        const cloudApiKey = tl.getInput("cloud_api_key", cloudPublish) ?? "";
        let cloudUrl: string = "";
        if (cloudPublish) {
            cloudUrl = tl.getInputRequired("cloud_url");
        }
        if (cloudApiKey) {
            tl.setSecret(cloudApiKey);
        }

        let buildArgsArray: string[] = [];

        if (buildArgs) {
            const splitedBuildArgs = buildArgs.split("\n").map(x => x.trim()).filter(x => x.length > 0);

            for (const x of splitedBuildArgs) {
                const name = x.split("=")[0];
                if (secretBuildArgs.includes(name)) {
                    // as build arg the value would be stored in the image metadata
                    console.log(`##vso[task.logissue type=warning]Build arg ${name} is ignored: pass it with the cloud_api_key or buildSecrets input (BuildKit secret)`);
                    continue;
                }
                buildArgsArray.push("--build-arg");
                buildArgsArray.push(x);
            }
        }

        const registryPassword: string = registryEndpoint["password"] ?? "";
        if (registryPassword) {
            tl.setSecret(registryPassword);
        }
        const loginResult = await run_cmd("docker", ["login", "-u", registryEndpoint["username"], "--password-stdin"], {}, registryPassword);
        if (loginResult != 0) {
            throw new Error("docker login failed");
        }

        const buildSecrets = parseBuildSecrets(tl.getInput("buildSecrets", false) ?? "");
        if (cloudApiKey && !buildSecrets.some(x => x.id === "cloud_api_key")) {
            buildSecrets.push({ id: "cloud_api_key", env: "CLOUD_API_KEY", value: cloudApiKey });
        }

        let taskList = [];

        const amd64Task = buildAndPushImage(dockerAmd64, buildArgsArray, imageName, version, buildVersion, "amd64", production, buildSecrets);
        taskList.push(amd64Task);
        if (dockerArm32) {
            let arm32Task = buildAndPushImage(dockerArm32, buildArgsArray, imageName, version, buildVersion, "arm", production, buildSecrets);
            taskList.push(arm32Task);
        }

        const result = await Promise.all(taskList);

        if (production) {
            branch = "";
        }
        else {
            branch = `-${branch}`;
        }

        // one manifest list for all tags: the registry reads each source image once instead of once per tag and image,
        // and buildx uses the login from above (docker manifest with its own --config pulled anonymously)
        const listTags = [`latest${branch}`, `${version}${branch}`];
        if (version != buildVersion) {
            listTags.push(`${buildVersion}${branch}`);
        }
        const sources = result.map(images => images[1]);
        await buildDockerManifest(listTags, sources, imageName);

        if (cloudPublish) {
            const deployResult = await automatica_cli(["DeployDockerUpdate", "-I", imageName, "-Im", `latest${branch}`, "-V", buildVersion, "-A", cloudApiKey, "-C", cloudUrl, "-Cl", tl.getVariable("Build.SourceBranchName") ?? ""]);

            if (deployResult != 0) {
                tl.setResult(tl.TaskResult.Failed, "DeployPlugin command failed");
                return;
            }
        }

    }
    catch (err: any) {
        tl.setResult(tl.TaskResult.Failed, err.message);
        console.error(err);
    }
}

interface BuildSecret {
    id: string;
    env: string;
    value: string;
}

/** never passed as --build-arg: build args are kept in the image history */
const secretBuildArgs = ["CLOUD_API_KEY", "FONTAWESOME_TOKEN"];

/**
 * buildSecrets input: one "id=value" per line, e.g. "devexpress_license=$(DEVEXPRESS_LICENSE)".
 * Each value reaches docker only through the environment (--secret id=<id>,env=<var>).
 */
function parseBuildSecrets(input: string): BuildSecret[] {
    const secrets: BuildSecret[] = [];
    for (const line of input.split("\n").map(x => x.trim()).filter(x => x.length > 0)) {
        const index = line.indexOf("=");
        const id = index > 0 ? line.substring(0, index).trim() : "";
        const value = index > 0 ? line.substring(index + 1).trim() : "";
        if (!/^[A-Za-z0-9_.-]+$/.test(id)) {
            throw new Error("buildSecrets: every line must be id=value");
        }
        if (!value) {
            // an unset optional secret (e.g. the DevExtreme license) is skipped, RUN --mount fails if it is required
            console.log(`##vso[task.logissue type=warning]Build secret ${id} has no value and is not passed`);
            continue;
        }
        tl.setSecret(value);
        secrets.push({ id, env: `AUTOMATICA_BUILD_SECRET_${secrets.length}`, value });
    }
    return secrets;
}

async function buildDockerManifest(tags: string[], sourceImages: string[], imageName: string) {
    const tagArgs: string[] = [];
    for (const tag of tags) {
        tagArgs.push("-t", `${imageName}:${tag}`);
    }

    // the per-arch images carry their platform (linux/amd64, linux/arm/v7) in the image config
    const retCode = await docker_cli(["buildx", "imagetools", "create", ...tagArgs, ...sourceImages]);

    if (retCode != 0) {
        throw new Error("error creating manifest...");
    }
}

async function buildAndPushImage(dockerFile: string, commonBuildArgs: string[], imageName: string, version: string, buildVersion: string, arch: "amd64" | "arm", production: boolean = true, secrets: BuildSecret[] = []) {
    const branch = tl.getVariable("Build.SourceBranchName") ?? "";

    const tag = `${imageName}:${arch}-${branch}-latest`;
    const tag3 = `${imageName}:${arch}-latest-${branch}`;
    const tag2 = `${imageName}:${arch}-${branch}-${version}`;

    let tags = ["-t", tag, "-t", tag2, "-t", tag3];
    if (buildVersion != version) {
        const tag3 = `${imageName}:${arch}-${branch}-${buildVersion}`;
        tags.push("-t", tag3);
    }

    // own copy: amd64 and arm run in parallel and must not see each other's RUNTIME_IMAGE_TAG
    const buildArgs = [...commonBuildArgs];
    if (production) {
        buildArgs.push("--build-arg", `RUNTIME_IMAGE_TAG=${arch}-latest`);
        buildArgs.push("--build-arg", "AUTOMATICA_CLOUD_ENVIRONMENT=master");
        buildArgs.push("--build-arg", `DEFAULT_TAG=latest`);
    } else {
        buildArgs.push("--build-arg", "AUTOMATICA_CLOUD_ENVIRONMENT=develop");
        buildArgs.push("--build-arg", `RUNTIME_IMAGE_TAG=${arch}-latest-develop`);
        buildArgs.push("--build-arg", `DEFAULT_TAG=latest-${branch}`);
    }

    // --secret needs BuildKit; the value only goes into the environment of the docker process
    const secretArgs: string[] = [];
    const env: NodeJS.ProcessEnv = { DOCKER_BUILDKIT: "1" };
    for (const secret of secrets) {
        secretArgs.push("--secret", `id=${secret.id},env=${secret.env}`);
        env[secret.env] = secret.value;
    }

    var buildResult = await run_cmd("docker", ["build", "-f", dockerFile, ...tags, ...secretArgs, ".", ...buildArgs], env);

    if (buildResult != 0) {
        throw new Error("error creating image...");
    }
    buildResult = await docker_cli(["push", tag]);

    if (buildResult != 0) {
        throw new Error("error pushing image...");
    }

    buildResult = await docker_cli(["push", tag2]);

    if (buildResult != 0) {
        throw new Error("error pushing image...");
    }
    buildResult = await docker_cli(["push", tag3]);

    if (buildResult != 0) {
        throw new Error("error pushing image...");
    }

    return [tag, tag2, tag3];
}

async function automatica_cli(params: string[]): Promise<number> {
    return run_cmd('automatica-cli', params);
}


async function docker_cli(params: string[]): Promise<number> {
    return run_cmd("docker", params);
}

async function run_cmd(cmd: string, params: string[], extraEnv: NodeJS.ProcessEnv = {}, stdin?: string) {
    return new Promise<number>((resolve) => {
        var spawn = require('child_process').spawn;
        var prc = spawn(cmd, params, { env: { ...process.env, ...extraEnv } });
        // the agent masks values registered with setSecret, local runs (test.sh) do not: never print the key
        console.log("spawning ", cmd, "with params", redact(params));

        if (stdin !== undefined) {
            prc.stdin.write(stdin);
        }
        prc.stdin.end();

        //noinspection JSUnresolvedFunction
        prc.stdout.setEncoding('utf8');
        prc.stdout.on('data', function (data: any) {
            var str = data.toString()
            var lines = str.split(/(\r?\n)/g);
            console.log(lines.join(""));
        });
        prc.stderr.on('data', function (data: any) {
            var str = data.toString()
            var lines = str.split(/(\r?\n)/g);
            console.log(lines.join(""));
        });

        prc.on('close', function (code: number) {
            console.log('process exit code ' + code);
            resolve(code);
        });

    });
}

/** hides the value that follows an api key or password option */
function redact(params: string[]): string[] {
    const secretOptions = ["-A", "-p", "--password"];
    return params.map((p, i) => i > 0 && secretOptions.includes(params[i - 1]) ? "***" : p);
}

run();