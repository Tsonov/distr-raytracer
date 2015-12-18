﻿'use strict'
var wsocket = require("socket.io-client"),
    spawn = require("child_process").spawn,
    fs = require("fs"),
    split = require("split"),
    os = require("os"),
    log = require('./helpers.js').log,
    uintToColor = require('./helpers.js').unsignedColorToNums,
    stringToColorNums = require("./helpers.js").stringToColorNums;

/* Exports */
exports.worker = worker;

var worker = function (url /* TODO: What other params? */) {
    // TODO: Don't autoopen (but allow other options to pass down)
    var socket = wsocket(url);
    
    /* Init */
    
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
    
    socket.on("render", function (imageparams) {
        log("Rendering for params: " + JSON.stringify(imageparams));
        var width = imageparams.width;
        var height = imageparams.height;
        var startX = imageparams.x;
        var startY = imageparams.y;
        
        // TODO: Separate concerns and all that fancy stuff
        var data = new Uint8ClampedArray(height * width * 3);
        
        log("Launching child render");
        // TODO: Real raytracer (ja-ja-ja)
        var render = spawn("TestInterop.exe");
        // Init render
        render.stdin.write("begin\r\n");
        render.stdin.write(width + "\r\n");
        render.stdin.write(height + "\r\n");
        render.stdin.write(startX + "\r\n");
        render.stdin.write(startY + "\r\n");
        // TODO: Do the split and line streaming in one stream instead of piping through split
        var handler = render.stdout.pipe(split());
        handler.on("data", (function () {
            var currentRow = 0;
            var result = function (line) {
                if (line.length == 0) return; // TODO: Figure if the empty row comes from the library implementation
                // TODO: Figure why is there an extra empty entry at the end
                var colors = line.split(" ").map(stringToColorNums);
                colors = colors.slice(0, colors.length - 1);
                // TODO: All Debug checks for sizes
                if (colors.length !== width) throw "Invalid size of colors array " + colors.length + ", expected " + width;
                for (var x = 0; x < colors.length; x++) {
                    data[currentRow * width * 3 + x * 3] = colors[x].r;
                    data[currentRow * width * 3 + x * 3 + 1] = colors[x].g;
                    data[currentRow * width * 3 + x * 3 + 2] = colors[x].b;
                }
                currentRow++;
            }
            
            return result;
        }()));
        
        handler.on("close", function () {
            log("Child process exited");
            var renderResult = {
                bitmap: data,
                width: width,
                height: height,
                startX: startX,
                startY: startY
            };
            socket.emit("render-finished", renderResult);
        })
    })
    
    socket.on("info", function (serverMsg) {
        log("Server says: " + serverMsg);
    });
    
    socket.on("disconnect", function () {
        log("Disconnected");
    });
    
    /* Return */
    return {};
}
