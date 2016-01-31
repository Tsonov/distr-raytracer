'use strict'
var path = require('path'),
    fs = require('fs');

exports.getPathToScene = getPathToScene;
exports.getSceneName = getSceneName;
exports.getSceneRelativePath = getSceneRelativePath;
exports.getSceneAbsolutePath = getSceneAbsolutePath;
exports.getSceneFiles = getSceneFiles;

var baseScenePath = "raytracer/data/",
    sceneExtension = ".trinity";

function getSceneFiles() {
    return fs.readdirSync(baseScenePath)
             .filter(function (file) { return path.extname(file) === sceneExtension })
}

function getPathToScene(name) {
    var properName = name.endsWith(sceneExtension) ? name : (name + sceneExtension);
    return path.join(baseScenePath, properName);
}

function getSceneName(scenePath) {
    return path.basename(scenePath, sceneExtension);
}

function getSceneRelativePath(depPath) {
    return path.relative(baseScenePath, depPath);
}

function getSceneAbsolutePath(depPath) {
    return path.resolve(baseScenePath, depPath);
}