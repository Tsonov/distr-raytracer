'use strict'
var socketio = require('socket.io'),
    http = require('http'),
    fs = require('fs'),
    Jimp = require('jimp');

var log = console.log.bind(console);
var server = http.createServer();

var totalWidth = 255;
var totalHeight = 255 * 2;

var clip = function (width, height, maxWidth, maxHeight) {

}

var splitWork = function(width, height) {
    // TODO: Handle cases of various worker length
    // TODO: Better algorithm
    var bucketCount = 10;
    if (height >= bucketCount) {
        var bucketHeight = Math.ceil(height / bucketCount);
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
            //result.pish({
            //    x: 0,
            //    y: bucketCount * bucketHeight,
            //    width: width,
            //    height: height - (bucketCount * bucketHeight)
            //})
        }
        return result;
    } else {
        // TODO: Implement
    }
}

var jobs = splitWork(totalWidth, totalHeight);
var expectedResponsesCount = jobs.length;
var image = new Jimp(totalWidth, totalHeight, 0xff0000ff);

log("Starting server");
var server = new socketio();

var childresponsehandler = function (socket, renderResult) {
    log("Child has rendered a result");
    var width = renderResult.width;
    var height = renderResult.height;
    var startX = renderResult.startX;
    var startY = renderResult.startY;
    log("Rendered result with width " + width + " and height " + height + " from [" + startX + ", " + startY + "]");
        
    image.scan(startX, startY, width, height, function (x, y, idx) {
        // TODO: Make indexing suck less
        this.bitmap.data[idx] = renderResult.bitmap[(y -startY) * width * 3 + (x - startX) * 3];      // R
        this.bitmap.data[idx + 1] = renderResult.bitmap[(y - startY) * width * 3 + (x - startX) * 3 + 1];  // G
        this.bitmap.data[idx + 2] = renderResult.bitmap[(y - startY) * width * 3 + (x - startX) * 3 + 2];  // B
        this.bitmap.data[idx + 3] = 255; // A, use full alpha
    });

    expectedResponsesCount--;
    // TODO: Extract
    if (expectedResponsesCount === 0) {
        if (jobs.length !== 0) throw "Invalid job count. Queue should be empty because all responses came back, real queue length was " + jobs.length;
        log("Outputing image");
        image.write("out_server.bmp");
        server.close();
    } else {
        var newJob = jobs.pop();
        socket.emit("message", "You will receive a new job shortly");
        socket.emit("render", newJob);
    }
}

var socketHandlerCapture = function(socketref, handler) {
    return function (responseData) {
        handler(socketref, responseData);
    }
}

server.on('connection', function (socket) {
    log("New child has connected");
    if (jobs.length == 0) {
        log("No jobs to process, closing child");
        socket.emit("info", "No jobs to process, go to sleep");
        socket.disconnect();
    } else {
        var job = jobs.pop();
        socket.emit("message", "You got connected successfully and will receive a job shortly");
        socket.on("render-finished", socketHandlerCapture(socket, childresponsehandler));
        
        socket.emit("render", job);
    }
    
});
server.listen(3000);
