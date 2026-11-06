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

        let cloudApiKey: string = "";
        let cloudUrl: string = "";
        if (cloudPublish) {
            cloudApiKey = tl.getInputRequired("cloud_api_key");
            cloudUrl = tl.getInputRequired("cloud_url");
        }
        let buildArgsArray = [];

        if (buildArgs) {
            const splitedBuildArgs = buildArgs.split("\n");

            for (const x of splitedBuildArgs) {
                buildArgsArray.push("--build-arg");
                buildArgsArray.push(x);
            }
        }

        await docker_cli(["login", "-u", registryEndpoint["username"], "-p", registryEndpoint["password"]]);

        let taskList = [];

        const amd64Task = buildAndPushImage(dockerAmd64, buildArgsArray, imageName, version, buildVersion, "amd64", production);
        taskList.push(amd64Task);
        if (dockerArm32) {
            let arm32Task = buildAndPushImage(dockerArm32, buildArgsArray, imageName, version, buildVersion, "arm", production);
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

async function buildAndPushImage(dockerFile: string, commonBuildArgs: any[], imageName: string, version: string, buildVersion: string, arch: "amd64" | "arm", production: boolean = true) {
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

    var buildResult = await docker_cli(["build", "-f", dockerFile, ...tags, ".", ...buildArgs]);

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

async function run_cmd(cmd: string, params: string[]) {
    return new Promise<number>((resolve) => {
        var spawn = require('child_process').spawn;
        var prc = spawn(cmd, params);
        console.log("spawning ", cmd, "with params", params);

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

run();