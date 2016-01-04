'use strict'
var socketio = require('socket.io'),
    log = require('./helpers.js').log,
    JobManager = require('./job-manager.js'),
    ImageMaster = require('./img-master.js'),
    curry = require('./helpers.js').curry;

/* Exports */
exports.distributor = distributor;

// TODO: Refactor
function distributor(socketServer) {
    var availableSockets = {},
        clientNs = socketServer.of("/client-ns"),    
        workerNs = socketServer.of("/worker-ns"),
        clientRoom = "clientSockets";
    
    /* Initialization */
    clientNs.on("connection", clientSocketConnected);
    workerNs.on("connection", workerSocketConnected);
    
    /* Methods */
    function start(port) {
        socketServ.listen(port);
    }
    
    /* Helper functions */
    function clientSocketConnected(clientSocket) {
        log("Client socket with id " + clientSocket.id + " has joined");
        clientSocket.join(clientRoom);
        
        clientSocket.on("startRendering", startRendering);
        var socketIds = Object.getOwnPropertyNames(availableSockets);
        for (let i = 0; i < socketIds.length; i++) {
            var worker = availableSockets[socketIds[i]];
            clientSocket.emit("worker-added", { id: worker.socket.id, info: worker.info });
        };
        
        clientSocket.on("disconnect", function () {
            log("Client socket with id " + clientSocket.id + " has disconnected");
        })
        
        clientSocket.on("error", log);
        
        
        function startRendering(renderParams) {
            log(renderParams);
            initRendering(clientSocket, renderParams.workers, renderParams.width, renderParams.height);
        }
    }
    
    function workerSocketConnected(workerSocket) {
        log("Socket with id " + workerSocket.id + " has connected");
        addToStorage({ socket: workerSocket, info: { cores: "Pending...", platform: "Unknown", hostname: "Pending..." } });
        
        workerSocket.emit("info", "You have connected successfully. Please introduce yourself.");
        workerSocket.on("introduce", function (introduceData) {
            log("Socket with id " + workerSocket.id + " has introduced itself");
            workerIntroduced(workerSocket.id, introduceData);
        })
        
        workerSocket.on("disconnect", function () {
            log("Socket with id " + workerSocket.id + " has disconnected");
            takeFromStorage(workerSocket.id);
        });
        
        workerSocket.on("error", log);
    }
    
    function createPool(socketsToInclude) {
        var pool = socketsToInclude.map(takeFromStorage);
        return pool;
    }
    
    function takeFromStorage(socketId) {
        var worker = availableSockets[socketId];
        if (worker === undefined || worker === null) {
            // Can happen if a worker disconnects while working
            log("Attempt to remove a worker that was not in storage");
            return;
        }
        
        delete availableSockets[socketId];
        clientNs.emit("worker-removed", socketId);
        return worker;
    }
    
    function addToStorage(socketInfo) {
        availableSockets[socketInfo.socket.id] = socketInfo;
        clientNs.emit("worker-added", { id: socketInfo.socket.id, info: socketInfo.info });
    }
    
    function workerIntroduced(workerId, data) {
        var worker = availableSockets[workerId];
        worker.info = data;
        clientNs.emit("worker-introduced", { id: worker.socket.id, info: worker.info });
    }
    
    function initRendering(clientSocket, workerSockets, width, height) {
        function cancelRendering() {
            log("Client " + clientSocket.id + " has cancelled the rendering process");
            master.cancel();
        }
        
        var pool = createPool(workerSockets),
            master;
        
        // Hook up for cancellation
        clientSocket.on("cancelRendering", cancelRendering);
        
        master = new ImageMaster(width, height, pool, clientSocket, function () {
            pool.forEach(function (workerInfo) {
                addToStorage(workerInfo, availableSockets);
            });
            
            // Unhook the handler to avoid double calls
            clientSocket.removeListener("cancelRendering", cancelRendering);
        });
        master.start();
    }
    
    /* Return */
    return {
        start: start,
    }
}


