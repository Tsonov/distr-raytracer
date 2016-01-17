'use strict'
var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    toArray = require('stream-to-array'),
    Archiver = require('archiver');

module.exports = exports = parseScene;

// Transforms a .trinity file into a self-sufficient object with metadata
// TODO: Create a path handler
function parseScene(scenePath, callback) {
    resolveDependenciesList(scenePath, function (err, sceneData) {
        if (err) callback(err);
        
        // TODO: Optimize memory usage
        var data = {
            sceneName: path.relative("raytracer/data/", scenePath),
            sceneContents: sceneData.sceneContents,
            fileDependencies: []
        };
        
        sceneData.dependencies.forEach(function (fileDependency) {
            fs.readFile(fileDependency, 'binary', function (err, fileContents) {
                if (err) callback(err);
                
                data.fileDependencies.push({
                    relativePath: path.relative("raytracer/data/", fileDependency),
                    contents: fileContents
                });
                
                if (data.fileDependencies.length === sceneData.dependencies.length) {
                    callback(null, data);
                }
            })
        });
    })
}

function resolveDependenciesList(scenePath, callback) {
    extractFileDependencies(scenePath, function (err, sceneData) {
        // Deps is relative to the file
        //var data,
        //archive = new Archiver('zip', {});
        
        if (err) callback(err);
        
        var resolvedDependencies = sceneData.dependencies.map(function (dep) {
            var absolutePath = path.resolve("raytracer/data/", dep),
                stats = fs.lstatSync(absolutePath);
            
            if (stats.isFile()) {
                return [absolutePath]
            } else if (stats.isDirectory()) {
                // This is only supported in the "folder" command which expects a folder with a list of files
                return fs.readdirSync(absolutePath).map(function (fileName) {
                    return path.join(absolutePath, fileName);
                });
            }
            else {
                callback("Invalid path " + dep + " found. Was neither a file, nor a dir");
            }
        }).reduce(function (a, b) { return a.concat(b) });
        
        callback(null, { sceneContents: sceneData.sceneContents, dependencies: resolvedDependencies });

        // Package format is a "data" folder
        // With all other files following the structure in the project
        // This keeps relative paths good while making the folder self-sufficient
        // And yes, this could also be better by modifying the paths in scenes on-the-fly :>
        // However, migrating new scenes from the raytracer project is much easier this way
        //archive.file(scenePath, "data/scenes/");
        //var data = dependencies.map(function (dep) {
        //    var absolutePath = path.resolve("raytracer/data/scenes/", dep),
        //        stats = fs.lstatSync(absolutePath),
        //        relativeArchivePath = path.relative("raytracer/data/scenes/", absolutePath);
            
        //    if (stats.isFile()) {
        //        archive.file(absolutePath, relativeArchivePath);
        //    } else if (stats.isDirectory()) {
        //        archive.directory(absolutePath, relativeArchivePath);
        //    }
        //    else {
        //        callback("Invalid path " + dep + " found. Was neither a file, nor a dir");
        //    }
        //})
        //archive.finalize();
        
        //// Convert the archive to a byte array
        //// Not optimal, but easier to get right for starters
        //toArray(archive, function (err, data) {
        //    if (err) callback(err);
            
        //    callback(null, {
        //        scenePath: scenePath,
        //        files: archive
        //    });
        //});
    });
}

// From the raytracer's perspective, a scene is mostly self-sufficient
// The main dependencies are external files that need to be transferred along with the scene file
// A raytracer can work with a scene as long it has:
//     1. The scene file itself
//     2. All external files (e.g. .obj and .bmp)
//     3. All external environment folders (contain multiple files). 
//        Note: Only single - level folders are supported (same as the raytracer itself)
// From the distributor's perspective, all other commands are irrelevant
function extractFileDependencies(scenePath, callback) {
    fs.readFile(scenePath, 'utf8', function (err, data) {
        if (err) callback(err);
        
        var dependencies = data
                .split(os.EOL)
                .filter(isDependency)
                .map(extractDependencyPath);
        
        callback(null, { sceneContents: data, dependencies: dependencies });
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
    // Could use railroads to make it more robust in case of errors (?)
    return line.trim()
        .split(/\s+/)[1]// Skip the command itself and assume multiple whitespace chars
        .replace(/"/g, ""); // Also, clear any double quotes that are part of the synthax
}