'use strict'

(function () {
        
        // Polyfill from MDN 
        if (!Array.prototype.findIndex) {
            Array.prototype.findIndex = function (predicate) {
                if (this === null) {
                    throw new TypeError('Array.prototype.findIndex called on null or undefined');
                }
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function');
                }
                var list = Object(this);
                var length = list.length >>> 0;
                var thisArg = arguments[1];
                var value;
                
                for (var i = 0; i < length; i++) {
                    value = list[i];
                    if (predicate.call(thisArg, value, i, list)) {
                        return i;
                    }
                }
                return -1;
            };
        }
        
        var fillCanvasWithData = function (context, colorBuffer, width, height, dx, dy) {
            // TODO: Measure performance and check if that's a good way to use the API
            // TODO: Detect missing typed arrays and raise an error
            // TODO: Look into streaming
            var img = context.createImageData(width, height),
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
            canvas = document.getElementById("image"),
            context = canvas.getContext("2d"),
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
            
            var ix = selectedWorkers.findIndex(function (info) { return info.id === workerInfo.id });
            if (ix !== -1) {
                selectedWorkers.splice(ix, 1);
                
            }
        });
        
        socket.on("info", function (message) {
            log("Server says:" + message);
        })
        
        socket.on("rendering-block", function (blockInfo) {
            // Aesthetics and all
            context.strokeStyle = 'black';
            context.strokeRect(blockInfo.dx, blockInfo.dy, blockInfo.width, blockInfo.height);
        })

        socket.on("rendered-output", function (renderedResult) {
            log("Received a bucket");
            log("Rendered result with width " + renderedResult.width + " and height " + renderedResult.height + " from [" + renderedResult.dx + ", " + renderedResult.dy + "]");
            
            fillCanvasWithData(context, renderedResult.bitmap, renderedResult.width, renderedResult.height, renderedResult.dx, renderedResult.dy);
        })
        
        socket.on("render-finished", function () {
            log("All done, exiting");
        })

        renderBtn.onclick = function () {
            // TODO: Make part of the scene data once real raytracer is available
            var totalWidth = 255;
            var totalHeight = 255 * 2;
            // Clear the canvas in case it was in use
            context.clearRect(0, 0, canvas.width, canvas.height);
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
            
        }
        
    }());