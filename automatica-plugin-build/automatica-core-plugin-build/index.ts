import tl = require('azure-pipelines-task-lib/task');
import { SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION } from 'constants';

async function run() {
    try {
        const publish = tl.getBoolInput("publish", true);
        const manifestPath = tl.getInput("manifest_path", true);
        const version = tl.getInput("version", true);
        let apiKey: string = "";
        let cloudUrl: string = "";

        if (publish) {
            apiKey = tl.getInput("api_key", true);
            cloudUrl = tl.getInput("cloud_url", true);
        }

        const config = tl.getInput("configuration", true);
        const outDir = tl.getInput("outputdirectory", true);

        tl.mkdirP(outDir);

        const manifestDir = require('path').dirname(manifestPath);
        const packResult = await automatica_cli(["Pack", "-W", manifestDir, "-V", version, "-C", config, "-O", outDir]);

        if (packResult != 0) {
            tl.setResult(tl.TaskResult.Failed, "Pack command failed");
            return;
        }
        
        if (publish) {
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
    return new Promise<number>((resolve) => {
        var spawn = require('child_process').spawn;
        var prc = spawn('automatica-cli', params);
        console.log("spawning automatica-cli with params", params);

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