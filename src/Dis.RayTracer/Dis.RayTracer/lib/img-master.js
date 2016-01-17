'use strict'

var JobManager = require('./job-manager.js'),
    parseScene = require('./scene-parser.js'),
    fs = require('fs'),
    curry = require('./helpers.js').curry,
    log = require('./helpers.js').log;

module.exports = exports = ImageMaster;

function ImageMaster(width, height, workers, client, scenePath, doneCallback) {
    if (!(this instanceof ImageMaster)) return new ImageMaster(width, height);
    
    // TODO: Validations
    this.width = width;
    this.height = height;
    this.workers = workers;
    this.client = client;
    this.scenePath = scenePath;
    this.doneCallback = doneCallback;
}

ImageMaster.prototype.splitWork = function () {
    // TODO: Handle cases of various worker length
    // TODO: Better algorithm
    var bucketCount = 4,
        result = [],
        bucketHeight;
    if (this.height >= bucketCount) {
        bucketHeight = Math.floor(this.height / bucketCount);
        for (let i = 0; i < bucketCount; i++) {
            // TODO: Splitting only by height for now...so the x and width is constant, only y and height changes
            result.push({
                dx: 0, 
                dy: bucketHeight * i,
                width: this.width,
                height: bucketHeight
            });
        }
        // TODO: Floating point comparisons?
        if (bucketCount * bucketHeight < this.height) {
            // Add one more bucket with the leftovers
            result.push({
                dx: 0,
                dy: bucketCount * bucketHeight,
                width: this.width,
                height: this.height - (bucketCount * bucketHeight) // TODO: Check math here
            })
        }
    } else {
        // TODO: Better algorithm as well
        for (let i = 0; i < this.height; i++) {
            result.push({
                dx: 0,
                dy: i,
                width: this.width,
                height: 1
            })
        }
    }
    return result;
}

ImageMaster.prototype.start = function () {
    var jobs = this.splitWork(),
        manager = new JobManager(jobs),
        that = this;
    
    log("Worker length is " + this.workers.length + " and job length is " + jobs.length);
    if (jobs.length < this.workers.length) throw "TODO: Handle case of too much resources";
    
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
    manager.jobDone(result);
    clientSocket.emit("rendered-output", result);
    
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

// TODO: Freeze if it should be a const
ImageMaster.COLOR_SIZE = 4; // RGBA, TODO: Make consistent with the raytracer and handle missing alpha