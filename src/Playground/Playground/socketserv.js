var socketio = require('socket.io'),
    http = require('http'),
    fs = require('fs'),
    Jimp = require('jimp');

var log = console.log.bind(console);
var server = http.createServer();

var jobs = [];
jobs.push({
    x: 0, 
    y: 0,
    width: 255,
    height: 255
});
jobs.push({
    x: 0, 
    y: 255,
    width: 255,
    height: 255
});

var totalWidth = 255;
var totalHeight = 255 * 2;
var image = new Jimp(totalWidth, totalHeight, 0xff0000ff);

log("Starting server");
var server = new socketio();

var childresponsehandler = function (renderResult) {
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


    // TODO: Extract
    if (jobs.length == 0) {
        log("Outputing image");
        image.write("out_server.bmp");
        server.close();
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
        socket.on("render-finished", childresponsehandler);
        
        socket.emit("render", job);
    }
    
});
server.listen(3000);
