#!/usr/bin/env node
'use strict'
var Renderer = require("../lib/worker-renderer.js"),
    os = require("os"),
    log = require('../lib/helpers.js').log,
    wsocket = require("socket.io-client");

var socket,
    dataHandler,
    worker;

// TODO: Command line param
socket = wsocket("http://localhost:1337/worker-ns");
dataHandler = function (renderResult) {
    socket.emit("render-finished", renderResult);
}
worker = new Renderer("../raytracer/bin/trinity.exe", "../raytracer/data", dataHandler);


socket.on("init-render", function (sceneData) {
    log("Launching child renderer");
    worker.init(sceneData);
    // TODO: Return a stream here that can be piped to the master instead of using callbacks
});

socket.on("end-render", function () {
    log("Closing child renderer");
    worker.close();
})

socket.on("cancel-render", function () {
    log("Rendering is cancelled by master");
    worker.close();
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
