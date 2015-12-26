// TODO: Separate link
var COLOR_SIZE = require('./img-master.js').COLOR_SIZE,
    spawn = require('child_process').spawn,
    stringToColorNums = require('./helpers.js').stringToColorNums;

module.exports = exports = ImageSlave;

function ImageSlave() {
    if (!(this instanceof ImageSlave)) return new ImageSlave();
    
    this.rendingProcess = null;
}

ImageSlave.prototype.init = function () {
    
    // TODO: Real raytracer (ja-ja-ja)
    this.rendingProcess = spawn("TestInterop.exe");
};

ImageSlave.prototype.render = function (width, height, dx, dy) {
    // TODO: Validations
    // TODO: Check if quaddmg supports RGBA and add support here as well
    // Each "render" step is a separate data generation process so data is only relevant inside this method
    var data = new Buffer(height * width * colorSize),
        // TODO: Do the split and line streaming in one stream instead of piping through split
        processOut = this.rendingProcess.stdout.pipe(split());
    
    // Attach to the stdout while rendering since the output is dependent on the current execution
    var handler = createStdOutHandler(data, width, height);
    processOut.on("data", handler);
    
    // Init render
    // TODO: Finalize protocol here
    this.rendingProcess.stdin.write("begin\r\n");
    this.rendingProcess.stdin.write(width + "\r\n");
    this.rendingProcess.stdin.write(height + "\r\n");
    this.rendingProcess.stdin.write(dx + "\r\n");
    this.rendingProcess.stdin.write(dy + "\r\n");

    // Detach stdout 
    processOut.removeListener("data", handler);
};

ImageSlave.prototype.close = function () {
    this.rendingProcess.close();
}

function createStdOutHandler(data, width, height) {
    // TODO: Assumes line-buffering right now, might not be optimal though
    var currentRow = 0,
        result;
    
    result = function (line) {
        if (line.length == 0) return; // TODO: Figure if the empty row comes from the library implementation
        // TODO: Figure why is there an extra empty entry at the end
        var colors = line.split(" ").map(stringToColorNums);
        colors = colors.slice(0, colors.length - 1);

        // TODO: All Debug checks for sizes
        if (colors.length !== width) throw "Invalid size of colors array " + colors.length + ", expected " + width;
        for (var x = 0; x < colors.length; x++) {
            data[currentRow * width * COLOR_SIZE + x * COLOR_SIZE] = colors[x].r;
            data[currentRow * width * COLOR_SIZE + x * COLOR_SIZE + 1] = colors[x].g;
            data[currentRow * width * COLOR_SIZE + x * COLOR_SIZE + 2] = colors[x].b;
            data[currentRow * width * COLOR_SIZE + x * COLOR_SIZE + 3] = 255; // Full alpha currently, TODO: Make Alpha an option
        }
        currentRow++;
    }
    
    return result;
}