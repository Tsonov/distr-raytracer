

(function () {
    'use strict'
    
    /* Assumes socket.io and rending.js */ 
    var renderBtn = document.getElementById("startRendering"),
        cancelBtn = document.getElementById("cancelRendering"),
        workersList = document.getElementById("workers"),
        canvas = document.getElementById("image"),
        context = canvas.getContext("2d"),
        log = console.log.bind(console),
        selectedWorkers = [],
        socket,
        startTime,
        rendering = false;
    
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
        context.fillStyle = "rgba(0, 0, 0, 0.2)";
        context.fillRect(blockInfo.dx, blockInfo.dy, blockInfo.width, blockInfo.height);
    })
    
    socket.on("rendered-output", function (renderedResult) {
        log("Received a bucket");
        log("Rendered result with width " + renderedResult.width + " and height " + renderedResult.height + " from [" + renderedResult.dx + ", " + renderedResult.dy + "]");
        
        fillCanvasWithData(context, renderedResult.bitmap, renderedResult.width, renderedResult.height, renderedResult.dx, renderedResult.dy);
    })
    
    socket.on("render-finished", function () {
        log("All done, exiting");
        log("Rending took: " + (new Date().getTime() - startTime) / 1000);
    })
    
    renderBtn.onclick = function () {
        if (rendering) {
            // TODO: Message box
            alert("Already rendering. Cancel first.");
            return;
        }
        
        // TODO: Make configurable from screen
        var totalWidth = 640;
        var totalHeight = 480;
        // Resize the canvas
        canvas.width = totalWidth;
        canvas.height = totalHeight;
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
        startTime = new Date().getTime();
        rendering = true;
    }
    
    cancelBtn.onclick = function () {
        if (!rendering) {
            return;
        }
        socket.emit("cancelRendering");
        rendering = false;
    }
}());