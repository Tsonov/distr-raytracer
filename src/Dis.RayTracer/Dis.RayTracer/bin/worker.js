﻿#!/usr/bin/env node
'use strict'
var Slave = require("../lib/img-slave.js"),
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
worker = new Slave(dataHandler);


socket.on("init-render", function () {
    log("Launching child renderer");
    worker.init();
    // TODO: Return a stream here that can be piped to the master instead of using callbacks
});

socket.on("end-render", function () {
    log("Closing child renderer");
    worker.close();
})

socket.on("render", function (imageparams) {
    log("Rendering for params: " + JSON.stringify(imageparams));
    var width = imageparams.width;
    var height = imageparams.height;
    var startX = imageparams.x;
    var startY = imageparams.y;
    
    worker.render(width, height, startX, startY);
})

socket.on("connect", function () {
    log("Connected successfully");
    var introductoryData = {
        cores: os.cpus().length,
        totalMemory: os.totalmem(),
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
