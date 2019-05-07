import tl = require('azure-pipelines-task-lib/task');
import process = require('process')
var fs = require('fs');
var path = require('path');

async function run() {
    try {
        const publish = tl.getBoolInput("publish", true);
        const dockerize = tl.getBoolInput("dockerize", true);

        let docker_user = "";
        let docker_pw = "";
        if (dockerize) {
            docker_user = tl.getInput("docker_user", true);
            docker_pw = tl.getInput("docker_password", true);

        }

        const pluginName = tl.getInput("plugin_name", true);
        const manifestPath = tl.getInput("manifest_path", true);
        
        const manifestDirectory = "." + manifestPath.replace("automatica-manifest.json", "").replace(tl.cwd(), "");
        
        const version = tl.getInput("version", true);
        let apiKey: string = "";
        let cloudUrl: string = "";
        const manifestDir = require('path').dirname(manifestPath);

        if (publish) {
            apiKey = tl.getInput("api_key", true);
            cloudUrl = tl.getInput("cloud_url", true);
        }

        const config = tl.getInput("configuration", true);
        const outDir = tl.getInput("outputdirectory", true);

        tl.mkdirP(outDir);



        if (dockerize) {

            console.log("Copy", path.resolve(__dirname, "Dockerfile"), "to Dockerfile");
            tl.cp(path.resolve(__dirname, "Dockerfile"), "Dockerfile", "-f");

            const dockerTag = `automaticacore/plugin-${pluginName}:${version}-${process.arch}`.toLowerCase();
            const dockerTagLatest = `automaticacore/plugin-${pluginName}:latest-${process.arch}`.toLowerCase();
            await docker_cli(["login", "-u", docker_user, "-p", docker_pw]);

            var buildResult = await docker_cli(["build", "-f", "Dockerfile", "-t", dockerTag, "-t", dockerTagLatest, ".",
                "--build-arg", "MANIFEST_DIR=" + manifestDirectory, "--build-arg", "VERSION=" + version, "--build-arg", "CONFIG=" + config]);

            if (buildResult != 0) {
                tl.setResult(tl.TaskResult.Failed, "Docker build failed");
                return;
            }

            await docker_cli(["push", dockerTag]);
            await docker_cli(["push", dockerTagLatest]);
        }

        if (publish) {

            const packResult = await automatica_cli(["Pack", "-W", manifestDir, "-V", version, "-C", config, "-O", outDir]);

            if (packResult != 0) {
                tl.setResult(tl.TaskResult.Failed, "Pack command failed");
                return;
            }

            const deployResult = await automatica_cli(["DeployPlugin", "-F", outDir + "/", "-A", apiKey, "-C", cloudUrl]);

            if (deployResult != 0) {
                tl.setResult(tl.TaskResult.Failed, "DeployPlugin command failed");
                return;
            }
        }

    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
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