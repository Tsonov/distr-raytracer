'use strict'
var socketio = require('socket.io'),
    http = require('http'),
    log = require('./helpers.js').log;

/* Exports */
exports.distributor = distributor;

// TODO: Refactor
function distributor(socketServer/* TODO: params */) {
    var availableSockets = {},
        clientNs = socketServer.of("/client-ns"),    
        workerNs = socketServer.of("/worker-ns");
    
    
    /* Initialization */
    clientNs.on("connection", clientSocketConnected);
    workerNs.on("connection", workerSocketConnected);
    
    /* Methods */
    var start = function (port) {
        socketServ.listen(port);
    }
    
    /* Helper functions */
    function clientSocketConnected(clientSocket) {
        // TODO: Fix communication since it's a data race now
        log("Client socket with id " + clientSocket.id + " has joined");
        clientSocket.on("startRendering", startRendering);
        // TODO: More granular?
        clientSocket.emit("available-workers", Object.getOwnPropertyNames(availableSockets));
        clientSocket.on("disconnect", function () {
            log("Client socket with id " + clientSocket.id + " has disconnected");
        })
        
        clientSocket.on("error", log);
        
        
        function startRendering(renderParams /* TODO What parameters should be here? */) {
            log(renderParams);
            initRendering(socketServer, clientSocket, renderParams.workers, availableSockets, renderParams.width, renderParams.height);
        }
    }
    
    function workerSocketConnected(workerSocket) {
        log("Socket with id " + workerSocket.id + " has connected");
        availableSockets[workerSocket.id] = { socket: workerSocket, info: {} };
        
        workerSocket.emit("info", "You have connected successfully. Please introduce yourself.");
        workerSocket.on("introduce", function (introduceData) {
            log("Socket with id " + workerSocket.id + " has introduced itself");
            availableSockets[workerSocket.id].info = introduceData;
        })
        
        workerSocket.on("disconnect", function () {
            log("Socket with id " + workerSocket.id + " has disconnected");
            delete availableSockets[workerSocket.id];
        });
        
        workerSocket.on("error", log);
    }
    
    var splitWork = function (width, height) {
        // TODO: Handle cases of various worker length
        // TODO: Better algorithm
        var bucketCount = 4;
        if (height >= bucketCount) {
            var bucketHeight = Math.floor(height / bucketCount);
            var result = [];
            for (var i = 0; i < bucketCount; i++) {
                // TODO: Splitting only by height for now...so the x and width is constant, only y and height changes
                result.push({
                    x: 0, 
                    y: bucketHeight * i,
                    width: width,
                    height: bucketHeight
                });
            }
            // TODO: Floating point comparisons?
            if (bucketCount * bucketHeight < height) {
                // Add one more bucket with the leftovers
                result.push({
                    x: 0,
                    y: bucketCount * bucketHeight,
                    width: width,
                    height: height - (bucketCount * bucketHeight)// TODO: Check math here
                })
            }
            return result;
        } else {
            // TODO: Better algorithm as well
            var result = [];
            for (var i = 0; i < height; i++) {
                result.push({
                    x: 0,
                    y: i,
                    width: width,
                    height: 1
                })
            }
            return result;
        }
    }
    
    var createPool = function (socketsToInclude, socketStorage) {
        var pool = socketsToInclude.map(function (socketId) {
            var result = socketStorage[socketId];
            delete socketStorage[socketId];
            return result;
        });
        return pool;
    }
    
    var returnToStorage = function (socket, socketStorage) {
        socketStorage[socket.id] = socket;
    }
    
    var initRendering = function (server, clientSocket, workerSockets, socketStorage, width, height) {
        // TODO: Refactor
        var childresponsehandler = function (socket, renderResult) {
            log("Child " + socket.id + " has rendered a result");
            doneJobs.push({}); // TODO: Maybe pointless to be an array but fix later....
            var width = renderResult.width;
            var height = renderResult.height;
            var startX = renderResult.startX;
            var startY = renderResult.startY;
            log("Rendered result with width " + width + " and height " + height + " from [" + startX + ", " + startY + "]");
            
            // TODO: Don't generate a bitmap, pass the UInt8ClampedArray to the client instead
            //image.scan(startX, startY, width, height, function (x, y, idx) {
            //    // TODO: Make indexing suck less
            //    this.bitmap.data[idx] = renderResult.bitmap[(y - startY) * width * 3 + (x - startX) * 3];      // R
            //    this.bitmap.data[idx + 1] = renderResult.bitmap[(y - startY) * width * 3 + (x - startX) * 3 + 1];  // G
            //    this.bitmap.data[idx + 2] = renderResult.bitmap[(y - startY) * width * 3 + (x - startX) * 3 + 2];  // B
            //    this.bitmap.data[idx + 3] = 255; // A, use full alpha
            //});
            
            log(startY * width * colorSize + startX * colorSize);
            renderResult.bitmap.copy(image, startY * width * colorSize + startX * colorSize);
            
            // TODO: Extract
            if (jobs.length > 0) {
                // There are still jobs to process, give the worker a new one
                let newJob = jobs.pop();
                log(doneJobs.length);
                log("Sending " + newJob);
                socket.emit("info", "You will receive a new job shortly");
                socket.emit("render", newJob);
            }
            if (doneJobs.length === expectedJobCount) {
                // All jobs reported back, can render
                outputToClient();
            }
        }
        
        var outputToClient = function () {
            if (jobs.length !== 0) throw "Invalid job count. Queue should be empty because all responses came back, real queue length was " + jobs.length;
            if (doneJobs.length !== expectedJobCount) throw "Invalid done jobs count. All jobs must be done before outputing to client";
            log("Outputing image to client");
            clientSocket.emit("rendered-output", { width: width, height: height, buffer: image });
        }
        
        var pool = createPool(workerSockets, socketStorage),
            roomId = Date.now().toString(); // TODO: Actual ID or something
        log("Creating a new rendering room with id " + roomId + " with " + workerSockets.length + " workers");
        
        pool.forEach(function (socketInfo) {
            socketInfo.socket.join(roomId);
            socketInfo.socket.on("render-finished", socketHandlerCapture(socketInfo.socket, childresponsehandler));
        })
        clientSocket.join(roomId);
        // Client socket should ignore worker events and vice-versa
        // Just be nice, ok?
        server.to(roomId).emit("info", "Rendering has been requested");
        
        // Rendering and stuff
        var jobs = splitWork(width, height);
        var jobsInProcess = [], // TODO: Use for retry mechanism?
            doneJobs = [],
            expectedJobCount = jobs.length;
        var colorSize = 4; // TODO: Extract this in a common spot
        var image = new Buffer(width * height * colorSize);
        if (jobs.length < pool.length) throw "TODO: Handle case of too much resources";
        
        if (pool.length >= jobs.length) throw "Pool has " + pool.length + " workers but jobs are only " + jobs.length;
        log("Pool length is " + pool.length + " and job length is " + jobs.length);
        pool.forEach(function (socketInfo) {
            // TODO: Extract storage to a separate object
            var job = jobs.pop();
            //jobsInProcess.push(job);
            socketInfo.socket.emit("render", job);
        })
    }
    
    var socketHandlerCapture = function (socketref, handler) {
        return function (responseData) {
            handler(socketref, responseData);
        }
    }
    
    /* Return */
    return {
        start: start,
    }
}




