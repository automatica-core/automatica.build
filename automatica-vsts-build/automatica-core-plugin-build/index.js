"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var tl = require("azure-pipelines-task-lib/task");
var fs = require('fs');
var path = require('path');
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var publish, dockerize, manifestPath, version, apiKey, cloudUrl, manifestDir, config, outDir, packResult, deployResult, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    publish = tl.getBoolInput("publish", true);
                    dockerize = tl.getBoolInput("dockerize", true);
                    manifestPath = tl.getInput("manifest_path", true);
                    version = tl.getInput("version", true);
                    apiKey = "";
                    cloudUrl = "";
                    manifestDir = require('path').dirname(manifestPath);
                    if (publish) {
                        apiKey = tl.getInput("api_key", true);
                        cloudUrl = tl.getInput("cloud_url", true);
                    }
                    config = tl.getInput("configuration", true);
                    outDir = tl.getInput("outputdirectory", true);
                    tl.mkdirP(outDir);
                    if (dockerize) {
                        console.log("Copy", path.resolve(__dirname, "Dockerfile"), "to Dockerfile");
                        tl.cp(path.resolve(__dirname, "Dockerfile"), "Dockerfile", "-f");
                        console.log("Copy", path.resolve(__dirname, "Dockerfile.arm32"), "to Dockerfile.arm32");
                        tl.cp(path.resolve(__dirname, "Dockerfile.arm32"), "Dockerfile.arm32", "-f");
                    }
                    if (!publish) return [3 /*break*/, 3];
                    return [4 /*yield*/, automatica_cli(["Pack", "-W", manifestDir, "-V", version, "-C", config, "-O", outDir])];
                case 1:
                    packResult = _a.sent();
                    if (packResult != 0) {
                        tl.setResult(tl.TaskResult.Failed, "Pack command failed");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, automatica_cli(["DeployPlugin", "-F", outDir + "/", "-A", apiKey, "-C", cloudUrl, "-Cl", tl.getVariable("Build.SourceBranchName")])];
                case 2:
                    deployResult = _a.sent();
                    if (deployResult != 0) {
                        tl.setResult(tl.TaskResult.Failed, "DeployPlugin command failed");
                        return [2 /*return*/];
                    }
                    _a.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    tl.setResult(tl.TaskResult.Failed, err_1.message);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function automatica_cli(params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, run_cmd('automatica-cli', params)];
        });
    });
}
function docker_cli(params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, run_cmd("docker", params)];
        });
    });
}
function run_cmd(cmd, params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var spawn = require('child_process').spawn;
                    var prc = spawn(cmd, params);
                    console.log("spawning ", cmd, "with params", params);
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
                })];
        });
    });
}
run();
