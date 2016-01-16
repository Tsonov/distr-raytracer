// TODO: Separate link
'use strict'
var COLOR_SIZE = require('./img-master.js').COLOR_SIZE,
    spawn = require('child_process').spawn,
    os = require('os'),
    path = require('path'),
    stringToColorNums = require('./helpers.js').stringToColorNums,
    split = require('split'),
    log = require('./helpers.js').log;

module.exports = exports = Renderer;

// TODO: Make the callback a stream?
function Renderer(pathToExe, pathToData, resultHandler) {
    if (!(this instanceof Renderer)) return new Renderer(dataHandler);
    
    // TODO: Validations
    this.rendingProcess = null;
    this.pathToExe = path.resolve(pathToExe);
    this.pathToData = path.resolve(pathToData);
    this.resultHandler = resultHandler;
}

Renderer.prototype.init = function (sceneData) {
    log(this.pathToData);
    log(this.pathToExe);
    log(sceneData.scenePath);
    // Create a copy of env to be nice and avoid overrides
    var env = Object.create(process.env);
    // Required to tell SDL to not mess with the stdout and stderr streams and leave them be (duh...)
    env.SDL_STDIO_REDIRECT = "no";
    this.rendingProcess = spawn(this.pathToExe, 
        ["-con", sceneData.scenePath], 
        { stdio: ['pipe', 'pipe', process.stderr], env: env, cwd: this.pathToData });
    // Tell the raytracer the scene dimensions for proper camera calculations
    this.rendingProcess.stdin.write(sceneData.sceneWidth + os.EOL);
    this.rendingProcess.stdin.write(sceneData.sceneHeight + os.EOL);
    this.rendingProcess.stdin.on("error", log);
    this.rendingProcess.stdout.on("error", log);
};

Renderer.prototype.render = function (width, height, dx, dy) {
    // TODO: Validations
    // TODO: Check if quaddmg supports RGBA and add support here as well
    // Each "render" step is a separate data generation process so data is only relevant inside this method
    var data = new Buffer(height * width * COLOR_SIZE),
        // TODO: Do the split and line streaming in one stream instead of piping through split
        processOut = this.rendingProcess.stdout.pipe(split()),
        dataCallback = this.resultHandler,
        handler;
    
    // Attach to the stdout while rendering since the output is dependent on the current execution
    handler = createStdOutHandler(data, width, height, function () {
        // Detach stdout once rendering is done
        processOut.removeListener("data", handler);
        
        // Report the result
        var renderResult = {
            bitmap: data,
            width: width,
            height: height,
            dx: dx,
            dy: dy
        };
        dataCallback(renderResult);
    });
    processOut.on("data", handler);
    
    // Init rendering
    this.rendingProcess.stdin.write("begin" + os.EOL);
    this.rendingProcess.stdin.write(width + os.EOL);
    this.rendingProcess.stdin.write(height + os.EOL);
    this.rendingProcess.stdin.write(dx + os.EOL);
    this.rendingProcess.stdin.write(dy + os.EOL);

};

Renderer.prototype.close = function () {
    // Kill the underlying process to cancel all rendering
    // Sending a close message is pointless since the raytracer is probably in progress
    // Also, we are going to kill the process anyway so it can't really do much
    this.rendingProcess.kill();
    this.rendingProcess = null;
}

function createStdOutHandler(data, width, height, finishedCallBack) {
    // TODO: Assumes line-buffering right now, might not be optimal though
    var currentRow = 0,
        result,
        done = false,
        started = false;
    
    result = function (line) {
        if (line.length == 0) return; // TODO: Figure if the empty row comes from the library implementation
        if (line.indexOf("Starting") !== -1) {
            log("Rending has now begun");
            started = true;
            return;
        }
        
        if (line.indexOf("Finished") !== -1) {
            log("Rending is done");
            finishedCallBack();
            done = true;
            return;
        }
        if (done || !started) return;
        
        // TODO: Figure why is there an extra empty entry at the end
        var colors = line.split(" ").map(stringToColorNums).slice(0, -1);

        // TODO: All Debug checks for sizes
        if (colors.length !== width) throw "Invalid size of colors array " + colors.length + ", expected " + width;
        for (let x = 0; x < colors.length; x++) {
            data[currentRow * width * COLOR_SIZE + x * COLOR_SIZE] = colors[x].r;
            data[currentRow * width * COLOR_SIZE + x * COLOR_SIZE + 1] = colors[x].g;
            data[currentRow * width * COLOR_SIZE + x * COLOR_SIZE + 2] = colors[x].b;
            data[currentRow * width * COLOR_SIZE + x * COLOR_SIZE + 3] = 255; // Full alpha, raytracer does not support alpha channel
        }
        currentRow++;
    }
    
    return result;
}