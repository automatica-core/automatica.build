"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
        var endpointId, registryEndpoint, dockerAmd64, dockerArm32, imageName, buildArgs, version, buildArgsArray, splitedBuildArgs, _i, splitedBuildArgs_1, x, amd64, arm32, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    endpointId = tl.getInput("dockerRegistryEndpoint");
                    registryEndpoint = tl.getEndpointAuthorization(endpointId, false).parameters;
                    dockerAmd64 = tl.getPathInput("dockerfile_amd64", true);
                    dockerArm32 = tl.getPathInput("dockerfile_arm32", false);
                    imageName = tl.getInput("imageName", true);
                    buildArgs = tl.getInput("buildArgs", false);
                    version = tl.getInput("version", true);
                    buildArgsArray = [];
                    if (buildArgs) {
                        splitedBuildArgs = buildArgs.split("\n");
                        for (_i = 0, splitedBuildArgs_1 = splitedBuildArgs; _i < splitedBuildArgs_1.length; _i++) {
                            x = splitedBuildArgs_1[_i];
                            buildArgsArray.push("--build-arg");
                            buildArgsArray.push(x);
                        }
                    }
                    return [4 /*yield*/, docker_cli(["login", "-u", registryEndpoint["username"], "-p", registryEndpoint["password"]])];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, buildAndPushImage(dockerAmd64, buildArgsArray, imageName, version, "amd64")];
                case 2:
                    amd64 = _a.sent();
                    arm32 = [];
                    if (!dockerArm32) return [3 /*break*/, 4];
                    return [4 /*yield*/, buildAndPushImage(dockerArm32, buildArgsArray, imageName, version, "arm")];
                case 3:
                    arm32 = _a.sent();
                    _a.label = 4;
                case 4:
                    console.log("Copy", path.resolve(__dirname, "docker.config"), "to config.json");
                    tl.cp(path.resolve(__dirname, "docker.config"), "config.json", "-f");
                    return [4 /*yield*/, buildDockerManifest(amd64, arm32, imageName, registryEndpoint)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    tl.setResult(tl.TaskResult.Failed, err_1.message);
                    console.error(err_1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function buildDockerManifest(amdImages, armImages, imageName, registryEndpoint) {
    return __awaiter(this, void 0, void 0, function () {
        var branch, retCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    branch = tl.getVariable("Build.SourceBranchName");
                    return [4 /*yield*/, docker_manifest(["create", imageName + ":latest-" + branch].concat(amdImages, armImages, ["--amend"]))];
                case 1:
                    retCode = _a.sent();
                    if (retCode != 0) {
                        throw new Error("error creating manifest...");
                    }
                    return [4 /*yield*/, dockerManifestAnnotate(amdImages, imageName + ":latest-" + branch, "amd64")];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, dockerManifestAnnotate(armImages, imageName + ":latest-" + branch, "arm")];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, docker_cli(["--config", "./", "login", "-u", registryEndpoint["username"], "-p", registryEndpoint["password"]])];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, docker_manifest(["push", imageName + ":latest-" + branch])];
                case 5:
                    retCode = _a.sent();
                    if (retCode != 0) {
                        throw new Error("error pushing manifest image...");
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function dockerManifestAnnotate(imageNames, imageName, arch) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, imageNames_1, image, retCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _i = 0, imageNames_1 = imageNames;
                    _a.label = 1;
                case 1:
                    if (!(_i < imageNames_1.length)) return [3 /*break*/, 4];
                    image = imageNames_1[_i];
                    return [4 /*yield*/, docker_manifest(["annotate", "--arch", arch, "--os", "linux", imageName, image])];
                case 2:
                    retCode = _a.sent();
                    if (retCode != 0) {
                        throw new Error("error annotate image...");
                    }
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function buildAndPushImage(dockerFile, buildArgs, imageName, version, arch) {
    return __awaiter(this, void 0, void 0, function () {
        var branch, tag, tag2, buildResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    branch = tl.getVariable("Build.SourceBranchName");
                    tag = imageName + ":" + arch + "-" + branch + "-latest";
                    tag2 = imageName + ":" + arch + "-" + branch + "-" + version;
                    return [4 /*yield*/, docker_cli(["build", "-f", dockerFile, "-t", tag, "-t", tag2, "."].concat(buildArgs))];
                case 1:
                    buildResult = _a.sent();
                    if (buildResult != 0) {
                        throw new Error("error creating image...");
                    }
                    return [4 /*yield*/, docker_cli(["push", tag])];
                case 2:
                    buildResult = _a.sent();
                    if (buildResult != 0) {
                        throw new Error("error pushing image...");
                    }
                    return [4 /*yield*/, docker_cli(["push", tag2])];
                case 3:
                    buildResult = _a.sent();
                    if (buildResult != 0) {
                        throw new Error("error pushing image...");
                    }
                    return [2 /*return*/, [tag, tag2]];
            }
        });
    });
}
function docker_manifest(params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, run_cmd("docker", ["--config", "./", "manifest"].concat(params))];
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
