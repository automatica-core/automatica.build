"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const publish = tl.getBoolInput("publish", true);
            const manifestPath = tl.getInput("manifest_path", true);
            const version = tl.getInput("version", true);
            let apiKey = "";
            let cloudUrl = "";
            if (publish) {
                apiKey = tl.getInput("api_key", true);
                cloudUrl = tl.getInput("cloud_url", true);
            }
            const config = tl.getInput("configuration", true);
            const outDir = tl.getInput("outputdirectory", true);
            tl.mkdirP(outDir);
            const manifestDir = require('path').dirname(manifestPath);
            const packResult = yield automatica_cli(["Pack", "-W", manifestDir, "-V", version, "-C", config, "-O", outDir]);
            if (packResult != 0) {
                tl.setResult(tl.TaskResult.Failed, "Pack command failed");
                return;
            }
            if (publish) {
                const deployResult = yield automatica_cli(["DeployPlugin", "-F", outDir + "/", "-A", apiKey, "-C", cloudUrl]);
                if (deployResult != 0) {
                    tl.setResult(tl.TaskResult.Failed, "DeployPlugin command failed");
                    return;
                }
            }
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    });
}
function automatica_cli(params) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            var spawn = require('child_process').spawn;
            var prc = spawn('automatica-cli', params);
            console.log("spawning automatica-cli with params", params);
            //noinspection JSUnresolvedFunction
            prc.stdout.setEncoding('utf8');
            prc.stdout.on('data', function (data) {
                var str = data.toString();
                var lines = str.split(/(\r?\n)/g);
                console.log(lines.join(""));
            });
            prc.stderr.on('data', function (data) {
                var str = data.toString();
                var lines = str.split(/(\r?\n)/g);
                console.log(lines.join(""));
            });
            prc.on('close', function (code) {
                console.log('process exit code ' + code);
                resolve(code);
            });
        });
    });
}
run();
