import tl = require('azure-pipelines-task-lib/task');
import process = require('process')
var fs = require('fs');
var path = require('path');

async function run() {
    try {


        const dockerAmd64 = tl.getInput("dockerfile-amd64", true);
        const dockerArm32 = tl.getInput("dockerfile-arm32", false);
        const imageName = tl.getInput("imageName", true);

        const buildArgs = tl.getInput("buildArgs", true);
        const version = tl.getInput("version", true);

        let buildArgsArray = [];

        const splitedBuildArgs = buildArgs.split("\n");

        for (const x of splitedBuildArgs) {
            buildArgsArray.push("--build-arg");
            buildArgsArray.push(x);
        }

        await buildImage(dockerAmd64, buildArgsArray, imageName, version, "amd64");

        if (dockerArm32) {
            await buildImage(dockerArm32, buildArgsArray, imageName, version, "arm32");
        }

    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

async function buildImage(dockerFile: string, buildArgs: any[], imageName: string, version: string, arch: "amd64" | "arm32") {
    const tag = `${imageName}:${arch}-latest`;
    const tag2 = `${imageName}:${arch}-${version}`;


    var buildResult = await docker_cli(["build", "-f", dockerFile, "-t", tag, "-t", tag2, ".", ...buildArgs]);

    return buildResult;
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