

(function () {
    'use strict'
    function addDebugMessage(message) {
        var p = document.createElement("p"),
            text = document.createTextNode(message);
        
        p.appendChild(text);
        debugArea.appendChild(p);
    }
    
    function getOsClassname(os) {
        if (os === "win32" || os === "win64") {
            return "fa-windows";
        }
        else if (os === "linux") {
            return "fa-linux";
        } else if (os === "darwin") {
            return "fa-apple";
        }
        else {
            return "fa-question-circle";
        }
    }
    
    function createWorkerDisplayElement(workerInfo) {
        var divRoot = document.createElement("div"),
            divOs = document.createElement("div"),
            spanOs = document.createElement("span"),
            divInfo = document.createElement("div"),
            divCores = document.createElement("div"),
            spanCores = document.createElement("span"),
            textCores = document.createTextNode(workerInfo.cores),
            divName = document.createElement("div"),
            spanName = document.createElement("span"),
            textName = document.createTextNode(workerInfo.hostname);
        
        divRoot.className = "list-group-item";
        divOs.className = "worker-os";
        spanOs.className = "fa " + getOsClassname(workerInfo.platform);
        divInfo.className = "worker-info";
        spanCores.className = "fa fa-tachometer worker-info-part";
        spanName.className = "fa fa-desktop worker-info-part";
        
        divRoot.appendChild(divOs);
        divOs.appendChild(spanOs);
        divRoot.appendChild(divInfo);
        divInfo.appendChild(divCores);
        divCores.appendChild(spanCores);
        spanCores.appendChild(textCores);
        divInfo.appendChild(divName);
        divName.appendChild(spanName);
        spanName.appendChild(textName);
        
        return divRoot;
    }
    
    /* Assumes socket.io and rending.js */ 
    var renderBtn = document.getElementById("startRendering"),
        cancelBtn = document.getElementById("cancelRendering"),
        workersList = document.getElementById("workers"),
        debugArea = document.getElementById("debugarea"),
        canvas = document.getElementById("image"),
        context = canvas.getContext("2d"),
        selectedWorkers = [],
        socket,
        startTime,
        rendering = false;
    
    // TODO: Fix the hardcoded value
    socket = io("http://localhost:1337/client-ns");
    
    socket.on("worker-added", function (workerInfo) {
        var li = document.createElement("li"),
            content = createWorkerDisplayElement(workerInfo.info);
        
        li.appendChild(content);
        li.id = workerInfo.id;
        workersList.appendChild(li);
        
        // TODO: Make truly selectable
        selectedWorkers.push(workerInfo);
    });
    
    socket.on("worker-removed", function (workerId) {
        var li = document.getElementById(workerId);
        if (li) {
            li.parentNode.removeChild(li);
        }
        
        var ix = selectedWorkers.findIndex(function (info) { return info.id === workerId });
        if (ix !== -1) {
            selectedWorkers.splice(ix, 1);
        }
    });
    
    socket.on("worker-introduced", function (workerInfo) {
        var li = document.getElementById(workerInfo.id),
            content;
        // li might have disappeared due to someone starting a render process with it 
        if (li) {
            content = createWorkerDisplayElement(workerInfo.info);
            while (li.firstChild) li.removeChild(li.firstChild);
            li.appendChild(content);
        }
    });
    
    socket.on("info", addDebugMessage);
    
    socket.on("rendering-block", function (blockInfo) {
        // Aesthetics and all
        context.fillStyle = "rgba(0, 0, 0, 0.2)";
        context.fillRect(blockInfo.dx, blockInfo.dy, blockInfo.width, blockInfo.height);
    })
    
    socket.on("rendered-output", function (renderedResult) {
        addDebugMessage("Received a bucket");
        addDebugMessage("Rendered result with width " + renderedResult.width + " and height " + renderedResult.height + " from [" + renderedResult.dx + ", " + renderedResult.dy + "]");
        
        fillCanvasWithData(context, renderedResult.bitmap, renderedResult.width, renderedResult.height, renderedResult.dx, renderedResult.dy);
    })
    
    socket.on("render-finished", function () {
        addDebugMessage("All done, exiting");
        addDebugMessage("Rending took: " + (new Date().getTime() - startTime) / 1000);
        rendering = false;
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
        addDebugMessage("Rendering an image with size [" 
            + renderParams.width + ", " + renderParams.height + "] with " 
            + renderParams.workers.length + " workers");
        socket.emit("startRendering", renderParams);
        startTime = new Date().getTime();
        rendering = true;
    }
    
    cancelBtn.onclick = function () {
        if (!rendering) {
            return;
        }
        addDebugMessage("Rendering is cancelled");
        socket.emit("cancelRendering");
        context.clearRect(0, 0, canvas.width, canvas.height);
        rendering = false;
    }
}());