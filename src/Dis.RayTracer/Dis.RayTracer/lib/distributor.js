'use strict'
var socketio = require('socket.io'),
    http = require('http'),
    Jimp = require('jimp'),
    log = require('./helpers.js').log;

/* Exports */
exports.distributor = distributor;


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
        log("Client socket with id " + clientSocket.id + " has joined");
        clientSocket.on("startRendering", startRendering);
        // TODO: More granular?
        clientSocket.emit("available-workers", Object.getOwnPropertyNames(availableSockets));
        clientSocket.on("disconnect", function () {
            log("Client socket with id " + clientSocket.id + " has disconnected");
        })
        
        clientSocket.on("error", log);
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
    
    function startRendering(renderParams /* TODO What parameters should be here? */) {
        log(renderParams);
        initRendering(clientSocket, renderParams.workers, availableSockets, renderParams.width, renderParams.height);
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
    
    var initRendering = function (clientSocket, workerSockets, socketStorage, width, height) {
        // TODO: Refactor
        var childresponsehandler = function (socket, renderResult) {
            log("Child has rendered a result");
            var width = renderResult.width;
            var height = renderResult.height;
            var startX = renderResult.startX;
            var startY = renderResult.startY;
            log("Rendered result with width " + width + " and height " + height + " from [" + startX + ", " + startY + "]");
            
            image.scan(startX, startY, width, height, function (x, y, idx) {
                // TODO: Make indexing suck less
                this.bitmap.data[idx] = renderResult.bitmap[(y - startY) * width * 3 + (x - startX) * 3];      // R
                this.bitmap.data[idx + 1] = renderResult.bitmap[(y - startY) * width * 3 + (x - startX) * 3 + 1];  // G
                this.bitmap.data[idx + 2] = renderResult.bitmap[(y - startY) * width * 3 + (x - startX) * 3 + 2];  // B
                this.bitmap.data[idx + 3] = 255; // A, use full alpha
            });
            
            expectedResponsesCount--;
            // TODO: Extract
            if (expectedResponsesCount === 0) {
                outputToClient();
            } else {
                var newJob = jobs.pop();
                socket.emit("info", "You will receive a new job shortly");
                socket.emit("render", newJob);
            }
        }
        
        var outputToClient = function () {
            if (jobs.length !== 0) throw "Invalid job count. Queue should be empty because all responses came back, real queue length was " + jobs.length;
            log("Outputing image to client");
            image.getBuffer(Jimp.MIME_BMP, function (err, buffer) {
                if (err) throw err; // TODO: Log and handle
                clientSocket.emit("rendered-output", { width: width, height: height, buffer: buffer });
                server.close();
            });
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
        var expectedResponsesCount = jobs.length;
        var image = new Jimp(width, height, 0x00ff00ff);
        if (jobs.length < pool.length) throw "TODO: Handle case of too much resources";
        
        pool.forEach(function (socketInfo) {
            var job = jobs.pop();
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




