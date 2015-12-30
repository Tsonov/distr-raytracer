'use strict'
var socketio = require('socket.io'),
    http = require('http'),
    fs = require('fs'),
    Jimp = require('jimp');

var log = console.log.bind(console);
var server = http.createServer();

var clip = function (width, height, maxWidth, maxHeight) {
    // TODO: Implement
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
                height: height - (bucketCount * bucketHeight)
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

log("Starting server");
var server = new socketio();
var clientNs = server.of("/client-ns");
var workerNs = server.of("/worker-ns");
var availableSockets = {};
clientNs.on("connection", function (clientSocket) {
    log("Client socket with id " + clientSocket.id + " has joined");
    clientSocket.on("startRendering", function (renderParams /* TODO What parameters should be here? */) {
        log(renderParams);
        initRendering(clientSocket, renderParams.workers, availableSockets, renderParams.width, renderParams.height);
    })
    // TODO: More granular?
    clientSocket.emit("available-workers", Object.getOwnPropertyNames(availableSockets));
    clientSocket.on("disconnect", function () {
        log("Client socket with id " + clientSocket.id + " has disconnected");
    })
    
    clientSocket.on("error", log);
});

workerNs.on("connection", function (socket) {
    log("Socket with id " + socket.id + " has connected");
    availableSockets[socket.id] = { socket: socket, info: {} };
    
    socket.emit("info", "You have connected successfully. Please introduce yourself.");
    socket.on("introduce", function (introduceData) {
        log("Socket with id " + socket.id + " has introduced itself");
        availableSockets[socket.id].info = introduceData;
    })
    
    socket.on("disconnect", function () {
        log("Socket with id " + socket.id + " has disconnected");
        delete availableSockets[socket.id];
    });
    
    socket.on("error", log);
});

server.listen(3000);

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
    
    var outputToClient = function() {
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

// Pool of sockets
// Rooms of sockets for a single rendering stream
// Namespace for worker sockets
// Namespace for client sockets (server should combine)


// Socket connects -> goes to pool
// ???? Create a room with the client and rendering sockets for streaming (how to trigger this?)
// Rendering starts, stream to client only
// -> Stream resources to socket
// -> Notify socket so it can init
// Rendering ends (from client)
// -> give socket back to pool
// -> tell socket so it can clean up

// TODOs: Socket failure, retries





//server.on('connection', function (socket) {
//    log("New child has connected");
//    if (jobs.length == 0) {
//        log("No jobs to process, closing child");
//        socket.emit("info", "No jobs to process, go to sleep");
//        socket.disconnect();
//    } else {
//        var job = jobs.pop();
//        socket.emit("message", "You got connected successfully and will receive a job shortly");
//        socket.on("render-finished", socketHandlerCapture(socket, childresponsehandler));

//        socket.emit("render", job);
//    }

//});
