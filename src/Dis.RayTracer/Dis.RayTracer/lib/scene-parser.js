'use strict'
var fs = require('fs'),
    os = require('os'),
    archiver = require('archiver');

module.exports = exports = parseScene;

// Transforms a .trinity file into a self-sufficient object with metadata
function parseScene(path, callback) {
    extractFileDependencies(path, function (err, data) {
        if (err) callback(err);

        callback(null, data);
    });
}

function createPackage(scenePath, dependencies) {

}

// From the raytracer's perspective, a scene is mostly self-sufficient
// The main dependencies are external files that need to be transferred along with the scene file
// A raytracer can work with a scene as long it has:
//     1. The scene file itself
//     2. All external files (e.g. .obj and .bmp)
//     3. All external environment folders (contain multiple files)
// From the distributor's perspective, all other commands are irrelevant
function extractFileDependencies(path, callback) {
    fs.readFile(path, 'utf8', function (err, data) {
        if (err) callback(err);
        
        var dependencies = data
                .split(os.EOL)
                .filter(isDependency)
                .map(extractDependencyPath);
        
        callback(null, dependencies);
    });
}

// Command synthax
//     file
//         <whitespace> file <whitespace> relative_path_to_resource
//     folder
//         <whitespace> folder <whitespace> relative_path_to_folder_with_exrs

function isDependency(e) {
    var trimmed = e.trim();
    return trimmed.startsWith("file") || trimmed.startsWith("folder");
}

function extractDependencyPath(line) {
    // Skip the command itself and assume multiple whitespace chars
    // Could use railroads to make it more robust (?)
    return e.trim().split("\\s+")[1];
}