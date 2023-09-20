import tl = require('azure-pipelines-task-lib/task');
import process = require('process')
var fs = require('fs');
var path = require('path');

async function run() {
    try {

        const endpointId = tl.getInput("dockerRegistryEndpoint");
        const registryEndpoint = tl.getEndpointAuthorization(endpointId, false).parameters;

        const dockerAmd64 = tl.getPathInput("dockerfile_amd64", true);
        const dockerArm32 = tl.getPathInput("dockerfile_arm32", false);
        const imageName = tl.getInput("imageName", true);

        const buildArgs = tl.getInput("buildArgs", false);
        const version = tl.getInput("version", true);
        const buildVersion = tl.getInput("buildVersion", false);
        const cloudPublish = tl.getBoolInput("cloud_publish", false) ?? false;

        let branch = tl.getVariable("Build.SourceBranchName");
        const production = branch === "main" || branch === "master";

        let cloudApiKey: string = "";
        let cloudUrl: string = "";
        if (cloudPublish) {
            cloudApiKey = tl.getInput("cloud_api_key", true);
            cloudUrl = tl.getInput("cloud_url", true);
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

        const amd64 = await buildAndPushImage(dockerAmd64, buildArgsArray, imageName, version, buildVersion, "amd64", production);
        let arm32: string[] = [];
        if (dockerArm32) {
            arm32 = await buildAndPushImage(dockerArm32, buildArgsArray, imageName, version,  buildVersion, "arm", production);
        }
        console.log("Copy", path.resolve(__dirname, "docker.config"), "to config.json");
        tl.cp(path.resolve(__dirname, "docker.config"), "config.json", "-f");

        if (production) {
            branch = "";
        }
        else {
            branch = `-${branch}`;
        }
        await buildDockerManifest(`latest${branch}`, amd64, arm32, imageName, registryEndpoint);
        await buildDockerManifest(`${version}${branch}`, amd64, arm32, imageName, registryEndpoint);
        if(version != buildVersion)
            await buildDockerManifest(`${buildVersion}${branch}`, amd64, arm32, imageName, registryEndpoint);

        if (cloudPublish) {
            const deployResult = await automatica_cli(["DeployDockerUpdate", "-I", imageName, "-Im", `latest${branch}`, "-V", buildVersion ?? version, "-A", cloudApiKey,  "-C", cloudUrl, "-Cl", tl.getVariable("Build.SourceBranchName")]);

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

async function buildDockerManifest(tag: string, amdImages: string[], armImages: string[], imageName: string, registryEndpoint: any) {

    var retCode = await docker_manifest(["create", `${imageName}:${tag}`, ...amdImages, ...armImages, "--amend"])

    if (retCode != 0) {
        throw new Error("error creating manifest...");
    }

    await dockerManifestAnnotate(amdImages, `${imageName}:${tag}`, "amd64");
    await dockerManifestAnnotate(armImages, `${imageName}:${tag}`, "arm");



    await docker_cli(["--config", "./", "login", "-u", registryEndpoint["username"], "-p", registryEndpoint["password"]]);

    retCode = await docker_manifest(["push", `${imageName}:${tag}`]);

    if (retCode != 0) {
        throw new Error("error pushing manifest image...");
    }
}

async function dockerManifestAnnotate(imageNames: string[], imageName: string, arch: string) {
    for (const image of imageNames) {
        const retCode = await docker_manifest(["annotate", "--arch", arch, "--os", "linux", imageName, image]);

        if (retCode != 0) {
            throw new Error("error annotate image...");
        }
    }
}

async function buildAndPushImage(dockerFile: string, buildArgs: any[], imageName: string, version: string, buildVersion: string, arch: "amd64" | "arm", production: boolean = true) {
    const branch = tl.getVariable("Build.SourceBranchName");

    const tag = `${imageName}:${arch}-${branch}-latest`;
    const tag3 = `${imageName}:${arch}-latest-${branch}`;
    const tag2 = `${imageName}:${arch}-${branch}-${version}`;

    let tags = ["-t", tag, "-t", tag2, "-t", tag3];
    if(buildVersion != version) {
        const tag3 = `${imageName}:${arch}-${branch}-${buildVersion}`;
        tags.push("-t", tag3);
    }

    if (production) {
        buildArgs.push("--build-arg", `RUNTIME_IMAGE_TAG=${arch}-latest`);
    } else {
        buildArgs.push("--build-arg", `RUNTIME_IMAGE_TAG=${arch}-latest-develop`);
    }

    buildArgs.push("--build-arg", `DEFAULT_TAG=${tag}`);

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

async function docker_manifest(params: string[]): Promise<number> {
    return run_cmd("docker", ["--config", "./", "manifest", ...params]);
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