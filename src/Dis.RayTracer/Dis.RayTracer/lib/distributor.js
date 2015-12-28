'use strict'
var socketio = require('socket.io'),
    http = require('http'),
    log = require('./helpers.js').log,
    JobManager = require('./job-manager.js'),
    ImageMaster = require('./img-master.js');

/* Exports */
exports.distributor = distributor;

// TODO: Refactor
function distributor(socketServer/* TODO: params */) {
    var availableSockets = {},
        clientNs = socketServer.of("/client-ns"),    
        workerNs = socketServer.of("/worker-ns"),
        clientRoom = "clientSockets";
    
    
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
        clientSocket.join(clientRoom);
        clientSocket.on("startRendering", startRendering);
        var socketIds = Object.getOwnPropertyNames(availableSockets);
        for (let i = 0; i < socketIds.length; i++) {
            var worker = availableSockets[socketIds[i]];
            clientSocket.emit("worker-added", { id: worker.socket.id, info: worker.info });
        };
        
        // TODO: More granular?
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
        addToStorage(workerSocket, availableSockets);
        
        workerSocket.emit("info", "You have connected successfully. Please introduce yourself.");
        workerSocket.on("introduce", function (introduceData) {
            log("Socket with id " + workerSocket.id + " has introduced itself");
            availableSockets[workerSocket.id].info = introduceData;
        })
        
        workerSocket.on("disconnect", function () {
            // TODO: This is not nearly robust enough...
            log("Socket with id " + workerSocket.id + " has disconnected");
            takeFromStorage(workerSocket, availableSockets);
        });
        
        workerSocket.on("error", log);
    }
    
    var createPool = function (socketsToInclude, socketStorage) {
        var pool = socketsToInclude.map(function (socketId) {
            return takeFromStorage(socketId, socketStorage);
        });
        return pool;
    }
    
    // TODO: Make consistent across functions
    // TODO: Validation for existance ?
    var takeFromStorage = function (socketId, socketStorage) {
        var worker = socketStorage[socketId];
        delete socketStorage[socketId];
        clientNs.emit("worker-removed", { id: worker.socket.id, info: worker.info });
        return worker;
    }
    
    var addToStorage = function (socket, socketStorage) {
        socketStorage[socket.id] = { socket: socket, info: {} };
        // TODO: Fix protocol for introduction and data transfer
        clientNs.emit("worker-added", { id: socket.id, info: "none yet" });
    }
    
    var initRendering = function (server, clientSocket, workerSockets, socketStorage, width, height) {
        // TODO: Refactor
        var childresponsehandler = function (socket, renderResult) {
            log("Child " + socket.id + " has rendered a result");
            manager.jobDone(renderResult);
            clientSocket.emit("rendered-output", renderResult);
            //imagemaster.handleResult(renderResult);
            
            if (manager.hasWork()) {
                // There are still jobs to process, give the worker a new one
                let newJob = manager.getWork();
                socket.emit("info", "You will receive a new job shortly");
                socket.emit("render", newJob);
                clientSocket.emit("rendering-block", newJob);
            }
            if (manager.workDone()) {
                // TODO: This should be triggarable from outside if continous rending will be supported
                pool.forEach(function (socketInfo) {
                    socketInfo.socket.emit("end-render");
                    addToStorage(socketInfo.socket, socketStorage);
                    // TODO: Manage room
                    log("Returned " + socketInfo.socket.id + " to storage after rendering is done");
                    // TODO: Remove event handler
                })
                outputToClient();
            }
        }
        
        var outputToClient = function () {
            if (manager.hasWork()) throw "Invalid job count. Queue should be empty because all responses came back, real queue length was " + manager.pendingJobCount();
            if (!manager.workDone()) throw "All jobs must be done before outputing to client";
            log("Rendering done");
            clientSocket.emit("render-finished", {});
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
        var imagemaster = new ImageMaster(width, height),
            jobs = imagemaster.splitWork(),
            manager = new JobManager(jobs);
        
        if (jobs.length < pool.length) throw "TODO: Handle case of too much resources";
        
        log("Pool length is " + pool.length + " and job length is " + jobs.length);
        
        // Init rendering
        pool.forEach(function (socketInfo) {
            // Signal the slave to initialize itself
            socketInfo.socket.emit("init-render")
            if (manager.hasWork()) {
                let job = manager.getWork();
                socketInfo.socket.emit("render", job);
                clientSocket.emit("rendering-block", job);
            }
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




