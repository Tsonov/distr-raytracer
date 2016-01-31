'use strict'

var JobManager = require('./job-manager.js'),
    parseScene = require('./scene-parser.js'),
    fs = require('fs'),
    curry = require('./helpers.js').curry,
    log = require('./helpers.js').log;

module.exports = exports = ImageMaster;

function ImageMaster(width, height, workers, client, scenePath, doneCallback) {
    if (!(this instanceof ImageMaster)) return new ImageMaster(width, height);
    
    if (width < 0 || height < 0 || workers.length === 0 || client === null || client === undefined) {
        log("Invalid parameters detected");
        log(JSON.stringify([width, height, workers, client]));
        throw "Invalid parameters detected in image master" + JSON.stringify([width, height, workers, client]);
    }
    this.width = width;
    this.height = height;
    this.workers = workers;
    this.client = client;
    this.scenePath = scenePath;
    this.doneCallback = doneCallback;
}

ImageMaster.prototype.splitWork = function () {
    function clip(width, height, rect) {
        if (rect.dx > width || rect.dy > height) {
            throw "Invalid bucket " + JSON.stringify(rect);
        }
        
        if (rect.dx + rect.width > width) {
            rect.width = width - rect.dx + 1;
        }
        if (rect.dy + rect.height > height) {
            rect.height = height - rect.dy + 1;
        }

        return rect;
    }

    var capacityCoef,
        bucketWidth,
        bucketHeight,
        bucketsOnX,
        bucketsOnY,
        result = [],
        clipCurrent = curry(clip, this.width, this.height);
    
    // We want to minimize bucket communication as much as possible 
    // while still leaving some loose ends to account for variable worker capacity
    // Below is mostly emperical
    var capacityCoef = this.workers.reduce(function (previous, current) {
        var cpus = (current.info ? current.info.cores : 1);
        return previous + cpus;
    }, 0);

    capacityCoef = Math.max(1, capacityCoef / 2);
    bucketWidth = Math.floor(this.width / capacityCoef);
    bucketHeight = Math.floor(this.height / capacityCoef);
    bucketsOnX = Math.ceil((this.width - 1) / (bucketWidth + 1));
    bucketsOnY = Math.ceil((this.height - 1) / (bucketHeight + 1));
    for (let y = 0; y < bucketsOnY; y++) {
        for (let x = 0; x < bucketsOnX; x++) {
            result.push({
                dx: x * bucketWidth, 
                dy: y * bucketHeight,
                width: bucketWidth,
                height: bucketHeight
            });
        }
    }
    
    result = result.map(clipCurrent);
    return result;
}

ImageMaster.prototype.start = function () {
    var jobs = this.splitWork(),
        manager = new JobManager(jobs),
        that = this;
    
    log("Worker length is " + this.workers.length + " and job length is " + jobs.length);
    
    parseScene(this.scenePath, function (err, sceneData) {
        if (err) throw err;
        
        that.workers.forEach(function (worker) {
            var responseHandler = createWorkerHandler(
                manager, 
                that.client, 
                worker.socket, 
                curry(stopRendering, that.workers, that.doneCallback));
            
            var initDoneHandler = function () {
                var socket = worker.socket;
                if (manager.hasWork()) {
                    // Give job if we didn't run out of them while initializing
                    let newJob = manager.getWork();
                    giveWork(newJob, socket, that.client);
                }
            }
            
            // Hook up a handler for done responses
            worker.socket.on("render-finished", responseHandler);
            
            // Hook up the "init" finished handler to start doing work
            worker.socket.once("init-done", initDoneHandler);
            
            // Signal the slave to initialize itself
            worker.socket.emit("init-render", {
                sceneWidth: that.width, 
                sceneHeight: that.height,
                sceneName: sceneData.sceneName, 
                sceneData: sceneData
            });
        });
    });
}

ImageMaster.prototype.cancel = function () {
    stopRendering(this.workers, this.doneCallback);
}

function stopRendering(workers, doneCallback) {
    closeWorkers(workers);
    doneCallback();
}

function closeWorkers(workers) {
    workers.forEach(function (workerInfo) {
        workerInfo.socket.removeAllListeners("render-finished");
        workerInfo.socket.removeAllListeners("request-file");
        workerInfo.socket.emit("end-render");
    });
}

function giveWork(job, worker, client) {
    worker.emit("render", job);
    client.emit("rendering-block", job);
}

function workerResultHandler(manager, clientSocket, worker, doneCallBack, result) {
    log("Child " + worker.id + " has rendered a result");
    var wasNew = manager.jobDone(result);
    if (wasNew) {
        // Avoid sending output twice
        clientSocket.emit("rendered-output", result);
    }
    
    
    if (manager.hasWork()) {
        // There are still jobs to process, give the worker a new one
        let newJob = manager.getWork();
        giveWork(newJob, worker, clientSocket);
    }
    if (manager.workDone()) {
        log("Rendering done");
        clientSocket.emit("render-finished", {});
        doneCallBack();
    }
}

function createWorkerHandler(manager, clientSocket, worker, callback) {
    return curry(workerResultHandler, manager, clientSocket, worker, callback);
}

ImageMaster.COLOR_SIZE = 4; // RGBA