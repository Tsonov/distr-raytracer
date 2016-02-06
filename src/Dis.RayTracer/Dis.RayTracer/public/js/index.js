

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
    
    function workerClickHandler() {
        var content = this.firstChild;
        var ix = findIndexSelectedWorker(this.id);
        if (ix !== -1) {
            // This worker was selected, de-select and remove from list
            selectedWorkers.splice(ix, 1);
            content.className = "list-group-item";
        } else {
            // Select the worker
            selectedWorkers.push(this.id);
            content.className = content.className + " active";
        }
    }
    
    function findIndexSelectedWorker(workerId) {
        return selectedWorkers.findIndex(function (id) { return id === workerId });
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
    
    function createDimensionEventHandler(dimensionTxtControl, dimensionName) {
        return function () {
            dimensionTxtControl.value = dimensionName + ":" + this.value;
        }
    }
    
    /* Assumes socket.io and rending.js */ 
    var renderBtn = document.getElementById("startRendering"),
        cancelBtn = document.getElementById("cancelRendering"),
        workersList = document.getElementById("workers"),
        widthRange = document.getElementById("width"),
        widthTxtbox = document.getElementById("widthTxt"),
        heightRange = document.getElementById("height"),
        heightTxtbox = document.getElementById("heightTxt"),
        editLink = document.getElementById("editBtn"),
        createLink = document.getElementById("createBtn"),
        scenesDropDown = document.getElementById("scenes"),
        debugArea = document.getElementById("debugarea"),
        canvas = document.getElementById("image"),
        context = canvas.getContext("2d"),
        selectedWorkers = [],
        socket,
        startTime,
        rendering = false;
    
    socket = io("/client-ns");
    
    socket.on("worker-added", function (workerInfo) {
        var li = document.createElement("li"),
            content = createWorkerDisplayElement(workerInfo.info);
        
        li.appendChild(content);
        li.id = workerInfo.id;
        workersList.appendChild(li);
        
        li.addEventListener("click", workerClickHandler);
    });
    
    socket.on("worker-removed", function (workerId) {
        var li = document.getElementById(workerId);
        if (li) {
            li.parentNode.removeChild(li);
        }
        
        var ix = findIndexSelectedWorker(workerId);
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
        // Avoid coloring blocks if they arrived in-between cancel request and cancel being done
        if (rendering) {
            // Aesthetics and all
            context.fillStyle = "rgba(0, 0, 0, 0.2)";
            context.fillRect(blockInfo.dx, blockInfo.dy, blockInfo.width, blockInfo.height);
        }
    })
    
    socket.on("rendered-output", function (renderedResult) {
        addDebugMessage("Rendered result with width " + renderedResult.width + " and height " + renderedResult.height + " from [" + renderedResult.dx + ", " + renderedResult.dy + "]");
        
        fillCanvasWithData(context, renderedResult.bitmap, renderedResult.width, renderedResult.height, renderedResult.dx, renderedResult.dy);
    })
    
    socket.on("render-finished", function () {
        addDebugMessage("All done, exiting");
        addDebugMessage("Rending took: " + (new Date().getTime() - startTime) / 1000);
        rendering = false;
    })
    
    renderBtn.addEventListener("click", function () {
        if (rendering) {
            alert("Already rendering. Cancel first.");
            return;
        }
        
        if (selectedWorkers.length === 0) {
            alert("You must select at least one worker first");
            return;
        }
        var totalWidth = parseInt(widthRange.value, 10),
            totalHeight = parseInt(heightRange.value, 10),
            scenePath = scenesDropDown.options[scenesDropDown.selectedIndex].value;
        
        // Resize the canvas
        canvas.width = totalWidth;
        canvas.height = totalHeight;
        // Clear the canvas in case it was in use
        context.clearRect(0, 0, canvas.width, canvas.height);
        var workerIds = selectedWorkers;
        
        var renderParams = {
            width: totalWidth,
            height: totalHeight,
            workers: workerIds,
            scenePath: scenePath
        };
        addDebugMessage("Rendering an image with size [" 
            + renderParams.width + ", " + renderParams.height + "] with " 
            + renderParams.workers.length + " workers");
        socket.emit("startRendering", renderParams);
        startTime = new Date().getTime();
        rendering = true;
    });
    
    cancelBtn.addEventListener("click", function () {
        if (!rendering) {
            return;
        }
        addDebugMessage("Rendering is cancelled");
        socket.emit("cancelRendering");
        context.clearRect(0, 0, canvas.width, canvas.height);
        rendering = false;
    });
    
    widthRange.addEventListener("input", createDimensionEventHandler(widthTxtbox, "Width"));
    
    widthRange.addEventListener("change", createDimensionEventHandler(widthTxtbox, "Width"));
    
    heightRange.addEventListener("input", createDimensionEventHandler(heightTxtbox, "Height"));
    
    heightRange.addEventListener("change", createDimensionEventHandler(heightTxtbox, "Height"));
    
    scenesDropDown.addEventListener("change", function () {
        var value = scenesDropDown.options[scenesDropDown.selectedIndex].value;
        editLink.setAttribute("href", "/scene?scenePath=" + encodeURIComponent(value));
    });
    
    // Set initial values
    widthTxtbox.value = "Width:" + widthRange.value;
    heightTxtbox.value = "Height:" + heightRange.value;
    scenesDropDown.selectedIndex = 0;
    var value = scenesDropDown.options[scenesDropDown.selectedIndex].value;
    editLink.setAttribute("href", "/scene?scenePath=" + encodeURIComponent(value));

    createLink.setAttribute("href", "/scene");
}());