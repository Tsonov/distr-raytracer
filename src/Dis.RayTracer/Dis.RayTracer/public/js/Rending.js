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
            if (colorArr.length !== width * height * 4) throw "Unexpected color array length, expected " + width * height * 4 + " but got " + colorArr.length;
            
            img.data.set(colorArr);
            context.putImageData(img, dx, dy);
        }
        /* Assumes socket.io */ 
        // TODO: Break into two files
        var renderBtn = document.getElementById("startRendering"),
            workersList = document.getElementById("workers"),
            log = console.log.bind(console),
            selectedWorkers = [],
            socket;
        
        // TODO: Fix the hardcoded value
        socket = io("http://localhost:1337/client-ns");
        
        socket.on("worker-added", function (workerInfo) {
            var li = document.createElement("li"),
                text = document.createTextNode(workerInfo.id + ":" + JSON.stringify(workerInfo.info)); // TODO: Prettify
            
            li.appendChild(text);
            li.id = workerInfo.id;
            workersList.appendChild(li);

            // TODO: Make truly selectable
            selectedWorkers.push(workerInfo);
        });
        
        socket.on("worker-removed", function (workerInfo) {
            var li = document.getElementById(workerInfo.id);
            if (li) {
                li.parentNode.removeChild(li);
            }
            // TODO: Remove from selected list if needed
        });
        
        renderBtn.onclick = function () {
            // TODO: Make part of the scene data once real raytracer is available
            var totalWidth = 255;
            var totalHeight = 255 * 2;
            if (selectedWorkers.length === 0) {
                alert("You must select at least one worker first");
                return;
            }
            var workerIds = selectedWorkers.map(function (workerInfo) { return workerInfo.id });
            
            var renderParams = {
                width: totalWidth,
                height: totalHeight,
                workers: workerIds
            };
            socket.emit("startRendering", renderParams);
            
            socket.on("info", function (message) {
                log("Server says:" + message);
            })
            
            socket.on("rendered-output", function (renderedResult) {
                log("Received image");
                log(renderedResult);
                if (renderedResult.width != totalWidth || renderedResult.height != totalHeight) throw "Unexpected mismatch in dimensions between client and server";
                // TODO: Refactor
                
                var canvas = document.getElementById("image");
                fillCanvasWithData(canvas, renderedResult.imageData, totalWidth, totalHeight, 0, 0);
                log("All done, exiting");
            })
        }
        
    }());