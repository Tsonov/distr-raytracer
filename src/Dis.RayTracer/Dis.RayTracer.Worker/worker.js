﻿#!/usr/bin/env node
'use strict'
var Renderer = require('./lib/worker-renderer.js'),
    os = require("os"),
    path = require('path'),
    temp = require('temp').track(),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    wsocket = require("socket.io-client"),
    log = require('./lib/helpers.js').log;

var socket,
    dataHandler,
    worker;

// TODO: Command line param
socket = wsocket("http://localhost:1337/worker-ns");
dataHandler = function (renderResult) {
    socket.emit("render-finished", renderResult);
}
worker = new Renderer("raytracer/trinity.exe", dataHandler);

socket.on("init-render", function (sceneInfo) {
    // Populate all files and the scene file before starting the renderer
    // TODO: Return a stream here that can be piped to the master instead of using callbacks
    log("Initializing dependencies");
    initializeFiles(sceneInfo.sceneData, function (err, dataFolder) {
        if (err) throw err;
        log("Launching child renderer");
        worker.init(sceneInfo, dataFolder, function () {
            socket.emit("init-done", {});
        });
    });

});

socket.on("end-render", function () {
    log("Closing child renderer");
    temp.cleanup();
    closeRendering(worker);
})

socket.on("cancel-render", function () {
    log("Rendering is cancelled by master");
    closeRendering(worker);
})

socket.on("render", function (imageparams) {
    log("Rendering for params: " + JSON.stringify(imageparams));
    var width = imageparams.width;
    var height = imageparams.height;
    var startX = imageparams.dx;
    var startY = imageparams.dy;
    
    worker.render(width, height, startX, startY);
})

socket.on("connect", function () {
    log("Connected successfully");
    var introductoryData = {
        cores: os.cpus().length,
        platform: os.platform(),
        hostname: os.hostname()
    };
    socket.emit("introduce", introductoryData);
})

socket.on("info", function (serverMsg) {
    log("Server says: " + serverMsg);
});

socket.on("disconnect", function () {
    log("Disconnected");
});

function initializeFiles(sceneData, callback) {
    var tempFolder = temp.mkdirSync(),
        filesToCreate = sceneData.fileDependencies.concat([{
                relativePath: sceneData.sceneName,
                contents: sceneData.sceneContents
            }]),
        created = 0;
    
    filesToCreate.forEach(function (fileData) {
        var fullPath = path.join(tempFolder, fileData.relativePath);
        mkdirp(path.dirname(fullPath), function (err, data) {
            if (err) callback(err);
            
            fs.writeFile(
                fullPath, 
                fileData.contents, 
                'binary', 
                function (err, data) {
                    if (err) callback(err);
                    created++;
                    log("Created file for " + fileData.relativePath + " under " + tempFolder);
                    if (created === filesToCreate.length) {
                        callback(null, tempFolder);
                    }
                });
        });

    });

}

function closeRendering(worker) {
    worker.close();
}