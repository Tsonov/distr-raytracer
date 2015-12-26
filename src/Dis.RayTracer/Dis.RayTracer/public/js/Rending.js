'use strict'

(function () {
        
        var fillCanvasWithData = function (canvas, colorBuffer, width, height, dx, dy) {
            // TODO: Measure performance and check if that's a good way to use the API
            // TODO: Detect missing typed arrays and raise an error
            // TODO: Look into streaming
            var context = canvas.getContext("2d"),
                img = context.createImageData(width, height),
                colorArr = new Uint8ClampedArray(colorBuffer);
            // TODO: Only RGBA-based colors allowed?
            // TODO: Check math
            // if (colorArr.length !== width * height * 4) throw "Unexpected color array length, expected " + width * height * 4 + " but got " + colorArr.length;
            
            img.data.set(colorArr);
            context.putImageData(img, dx, dy);
        }
        /* Assumes socket.io is included */ 
        var renderBtn = document.getElementById("startRendering");
        renderBtn.onclick = function () {
            var log = console.log.bind(console);
            var totalWidth = 255;
            var totalHeight = 255 * 2;
            // TODO: Fix the hardcoded value
            var socket = io("http://localhost:1337/client-ns");
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
                // TODO: Refactor
                
                var canvas = document.getElementById("image");
                fillCanvasWithData(canvas, imageData.buffer, totalWidth, totalHeight, 0, 0);
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
        }
        
    }());