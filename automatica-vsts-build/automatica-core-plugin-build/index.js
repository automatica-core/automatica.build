"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSigningEnv = getSigningEnv;
const tl = require("azure-pipelines-task-lib/task");
const process = require("process");
var fs = require('fs');
var path = require('path');
// automatica-cli signs the package when it finds the key in its environment (PackageSigning.KeyEnv / KeyFileEnv).
// Secret pipeline variables are not in the environment of a task, so the task reads them and passes them on.
const signingKeyVariable = "AUTOMATICA_PACKAGE_SIGNING_KEY";
const signingKeyFileVariable = "AUTOMATICA_PACKAGE_SIGNING_KEY_FILE";
const requireSignatureVariable = "AUTOMATICA_REQUIRE_PACKAGE_SIGNATURE";
async function run() {
    try {
        const publish = tl.getBoolInput("publish", true);
        const dockerize = tl.getBoolInput("dockerize", true);
        const manifestPath = tl.getInputRequired("manifest_path");
        const version = tl.getInputRequired("version");
        let apiKey = "";
        let cloudUrl = "";
        const manifestDir = require('path').dirname(manifestPath);
        if (publish) {
            apiKey = tl.getInputRequired("api_key");
            cloudUrl = tl.getInputRequired("cloud_url");
            tl.setSecret(apiKey);
        }
        const config = tl.getInputRequired("configuration");
        const outDir = tl.getInputRequired("outputdirectory");
        tl.mkdirP(outDir);
        if (dockerize) {
            console.log("Copy", path.resolve(__dirname, "Dockerfile"), "to Dockerfile");
            tl.cp(path.resolve(__dirname, "Dockerfile"), "Dockerfile", "-f");
            console.log("Copy", path.resolve(__dirname, "Dockerfile.arm32"), "to Dockerfile.arm32");
            tl.cp(path.resolve(__dirname, "Dockerfile.arm32"), "Dockerfile.arm32", "-f");
        }
        if (publish) {
            const packResult = await automatica_cli(["Pack", "-W", manifestDir, "-V", version, "-C", config, "-O", outDir], getSigningEnv());
            if (packResult != 0) {
                tl.setResult(tl.TaskResult.Failed, "Pack command failed");
                return;
            }
            const deployResult = await automatica_cli(["DeployPlugin", "-F", outDir + "/", "-A", apiKey, "-C", cloudUrl, "-Cl", tl.getVariable("Build.SourceBranchName") ?? ""]);
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
/**
 * The signing key (secret variable AUTOMATICA_PACKAGE_SIGNING_KEY, PEM or base64 PKCS#8) for the Pack command only.
 * Without a key the package is not signed: cores from 10.0 reject unsigned plugin packages.
 */
function getSigningEnv() {
    const env = {};
    const key = tl.getVariable(signingKeyVariable);
    const keyFile = tl.getVariable(signingKeyFileVariable);
    const requireSignature = tl.getVariable(requireSignatureVariable);
    if (key) {
        tl.setSecret(key);
        env[signingKeyVariable] = key;
    }
    if (keyFile) {
        env[signingKeyFileVariable] = keyFile;
    }
    if (requireSignature) {
        env[requireSignatureVariable] = requireSignature;
    }
    if (!key && !keyFile) {
        console.log(`##vso[task.logissue type=warning]No package signing key (secret variable ${signingKeyVariable}), the plugin package is NOT signed and cores from 10.0 will reject it`);
    }
    return env;
}
async function automatica_cli(params, extraEnv = {}) {
    return run_cmd('automatica-cli', params, extraEnv);
}
async function docker_cli(params) {
    return run_cmd("docker", params);
}
async function run_cmd(cmd, params, extraEnv = {}) {
    return new Promise((resolve) => {
        var spawn = require('child_process').spawn;
        // secrets only through the environment of the child process, never on the command line output
        var prc = spawn(cmd, params, { env: { ...process.env, ...extraEnv } });
        console.log("spawning ", cmd, "with params", redact(params));
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
}
/** hides the value that follows an api key or password option (local runs do not mask setSecret values) */
function redact(params) {
    const secretOptions = ["-A", "-p", "--password"];
    return params.map((p, i) => i > 0 && secretOptions.includes(params[i - 1]) ? "***" : p);
}
run();
