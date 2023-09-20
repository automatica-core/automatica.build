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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var tl = require("azure-pipelines-task-lib/task");
var fs = require('fs');
var path = require('path');
function run() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var endpointId, registryEndpoint, dockerAmd64, dockerArm32, imageName, buildArgs, version, buildVersion, cloudPublish, branch, production, cloudApiKey, cloudUrl, buildArgsArray, splitedBuildArgs, _i, splitedBuildArgs_1, x, amd64, arm32, deployResult, err_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 11, , 12]);
                    endpointId = tl.getInput("dockerRegistryEndpoint");
                    registryEndpoint = tl.getEndpointAuthorization(endpointId, false).parameters;
                    dockerAmd64 = tl.getPathInput("dockerfile_amd64", true);
                    dockerArm32 = tl.getPathInput("dockerfile_arm32", false);
                    imageName = tl.getInput("imageName", true);
                    buildArgs = tl.getInput("buildArgs", false);
                    version = tl.getInput("version", true);
                    buildVersion = (_a = tl.getInput("buildVersion", false)) !== null && _a !== void 0 ? _a : version;
                    cloudPublish = (_b = tl.getBoolInput("cloud_publish", false)) !== null && _b !== void 0 ? _b : false;
                    branch = tl.getVariable("Build.SourceBranchName");
                    production = branch === "main" || branch === "master";
                    cloudApiKey = "";
                    cloudUrl = "";
                    if (cloudPublish) {
                        cloudApiKey = tl.getInput("cloud_api_key", true);
                        cloudUrl = tl.getInput("cloud_url", true);
                    }
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
                    _c.sent();
                    return [4 /*yield*/, buildAndPushImage(dockerAmd64, buildArgsArray, imageName, version, buildVersion, "amd64", production)];
                case 2:
                    amd64 = _c.sent();
                    arm32 = [];
                    if (!dockerArm32) return [3 /*break*/, 4];
                    return [4 /*yield*/, buildAndPushImage(dockerArm32, buildArgsArray, imageName, version, buildVersion, "arm", production)];
                case 3:
                    arm32 = _c.sent();
                    _c.label = 4;
                case 4:
                    console.log("Copy", path.resolve(__dirname, "docker.config"), "to config.json");
                    tl.cp(path.resolve(__dirname, "docker.config"), "config.json", "-f");
                    if (production) {
                        branch = "";
                    }
                    else {
                        branch = "-".concat(branch);
                    }
                    return [4 /*yield*/, buildDockerManifest("latest".concat(branch), amd64, arm32, imageName, registryEndpoint)];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, buildDockerManifest("".concat(version).concat(branch), amd64, arm32, imageName, registryEndpoint)];
                case 6:
                    _c.sent();
                    if (!(version != buildVersion)) return [3 /*break*/, 8];
                    return [4 /*yield*/, buildDockerManifest("".concat(buildVersion).concat(branch), amd64, arm32, imageName, registryEndpoint)];
                case 7:
                    _c.sent();
                    _c.label = 8;
                case 8:
                    if (!cloudPublish) return [3 /*break*/, 10];
                    return [4 /*yield*/, automatica_cli(["DeployDockerUpdate", "-I", imageName, "-Im", "latest".concat(branch), "-V", buildVersion !== null && buildVersion !== void 0 ? buildVersion : version, "-A", cloudApiKey, "-C", cloudUrl, "-Cl", tl.getVariable("Build.SourceBranchName")])];
                case 9:
                    deployResult = _c.sent();
                    if (deployResult != 0) {
                        tl.setResult(tl.TaskResult.Failed, "DeployPlugin command failed");
                        return [2 /*return*/];
                    }
                    _c.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    err_1 = _c.sent();
                    tl.setResult(tl.TaskResult.Failed, err_1.message);
                    console.error(err_1);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
function buildDockerManifest(tag, amdImages, armImages, imageName, registryEndpoint) {
    return __awaiter(this, void 0, void 0, function () {
        var retCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, docker_manifest(__spreadArray(__spreadArray(__spreadArray(["create", "".concat(imageName, ":").concat(tag)], amdImages, true), armImages, true), ["--amend"], false))];
                case 1:
                    retCode = _a.sent();
                    if (retCode != 0) {
                        throw new Error("error creating manifest...");
                    }
                    return [4 /*yield*/, dockerManifestAnnotate(amdImages, "".concat(imageName, ":").concat(tag), "amd64")];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, dockerManifestAnnotate(armImages, "".concat(imageName, ":").concat(tag), "arm")];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, docker_cli(["--config", "./", "login", "-u", registryEndpoint["username"], "-p", registryEndpoint["password"]])];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, docker_manifest(["push", "".concat(imageName, ":").concat(tag)])];
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
function buildAndPushImage(dockerFile, buildArgs, imageName, version, buildVersion, arch, production) {
    if (production === void 0) { production = true; }
    return __awaiter(this, void 0, void 0, function () {
        var branch, tag, tag3, tag2, tags, tag3_1, buildResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    branch = tl.getVariable("Build.SourceBranchName");
                    tag = "".concat(imageName, ":").concat(arch, "-").concat(branch, "-latest");
                    tag3 = "".concat(imageName, ":").concat(arch, "-latest-").concat(branch);
                    tag2 = "".concat(imageName, ":").concat(arch, "-").concat(branch, "-").concat(version);
                    tags = ["-t", tag, "-t", tag2, "-t", tag3];
                    if (buildVersion != version) {
                        tag3_1 = "".concat(imageName, ":").concat(arch, "-").concat(branch, "-").concat(buildVersion);
                        tags.push("-t", tag3_1);
                    }
                    if (production) {
                        buildArgs.push("--build-arg", "RUNTIME_IMAGE_TAG=".concat(arch, "-latest"));
                    }
                    else {
                        buildArgs.push("--build-arg", "RUNTIME_IMAGE_TAG=".concat(arch, "-latest-develop"));
                    }
                    if (production) {
                        buildArgs.push("--build-arg", "DEFAULT_TAG=latest");
                    }
                    else {
                        buildArgs.push("--build-arg", "DEFAULT_TAG=latest-".concat(branch));
                    }
                    return [4 /*yield*/, docker_cli(__spreadArray(__spreadArray(__spreadArray(["build", "-f", dockerFile], tags, true), ["."], false), buildArgs, true))];
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
                    return [4 /*yield*/, docker_cli(["push", tag3])];
                case 4:
                    buildResult = _a.sent();
                    if (buildResult != 0) {
                        throw new Error("error pushing image...");
                    }
                    return [2 /*return*/, [tag, tag2, tag3]];
            }
        });
    });
}
function docker_manifest(params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, run_cmd("docker", __spreadArray(["--config", "./", "manifest"], params, true))];
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
