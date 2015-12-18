'use strict'
var socketio = require("socket.io-client"),
    fs = require('fs');
var log = console.log.bind(console);

var socket = new socketio("http://localhost:3000/client-ns");
var totalWidth = 255;
var totalHeight = 255 * 2;


var availableWorkers = [];

socket.on("available-workers", function (socketList) {
    availableWorkers = socketList;
    log(availableWorkers);
});

socket.on("info", function (message) {
    log("Server says:" + message);
})

socket.on("rendered-output", function (imageData) {
    log("Received image");
    log(imageData);
    if (imageData.width != totalWidth || imageData.height != totalHeight) throw "Unexpected mismatch in dimensions between client and server";
    fs.writeFile("out_client.bmp", imageData.buffer);
    log("All done, exiting");
    socket.close();
})

// TODO: Trigger another time..
setTimeout(function () {
    
    var renderParams = {
        width: totalWidth,
        height: totalHeight,
        workers: availableWorkers
    };
    socket.emit("startRendering", renderParams);
}, 1000);