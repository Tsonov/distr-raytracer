var log = console.log.bind(console);
var Jimp = require("jimp"),
    spawn = require("child_process").spawn,
    fs = require("fs"),
    split = require("split"),
    os = require("os");


var unsignedColorToNums = function (number, hasAlpha) {
    hasAlpha = hasAlpha || false;
    var redShift = hasAlpha ? 24 : 16;
    var greenShift = hasAlpha ? 16 : 8;
    var blueShift = hasAlpha ? 8 : 0;
    var red = (number & (255 << redShift)) >> redShift;
    var green = (number & (255 << greenShift)) >> greenShift;
    var blue = (number & (255 << blueShift)) >> blueShift;
    var alpha = hasAlpha ? (number & 255) : -1;
    return { r: red, g: green, b: blue, a: alpha };
}

var stringToColorNums = function (unsignedAsString) {
    return unsignedColorToNums(parseInt(unsignedAsString, 10));
}

var width = 1024,
    height = 768,
    startX = 0,
    startY = 0,
    data = new Uint8ClampedArray(height * width * 4),
    start = new Date().getTime();

log("Launching child render");
// Create a copy of env to be nice and avoid overrides
var env = Object.create(process.env);
// Required to tell SDL to not mess with the stdout and stderr streams and leave them be (duh...)
env.SDL_STDIO_REDIRECT = "no";
var render = spawn(__dirname + "\\trinity.exe", 
    ["-con", "data/beer.trinity"], 
    { stdio: ['pipe', 'pipe', process.stderr], env: env });
// Init render
render.stdin.on("error", log);

// Write dimensions
render.stdin.write(width + "\n");
render.stdin.write(height + "\n");
render.stdin.write("begin\r\n");
render.stdin.write(width + "\n");
render.stdin.write(height + "\n");
render.stdin.write(startX + "\n");
render.stdin.write(startY + "\n");
// TODO: Do the split and line streaming in one stream instead of piping through split
var handler = render.stdout.pipe(split());
handler.on("data", (function () {
    var currentRow = 0;
    var done = false;
    var started = false;
    var result = function (line) {
        //log(line);
        if (line.length == 0) return; // TODO: Figure if the empty row comes from the library implementation
        if (line.indexOf("Starting") !== -1) {
            log("Rending has now begun");
            started = true;
            return;
        }
        
        if (line.indexOf("Finished") !== -1) {
            log("Rending is done");
            output();
            done = true;
            return;
        }
        if (done || !started) return;
        
        // TODO: Figure why is there an extra empty entry at the end
        var colors = line.split(" ").map(stringToColorNums);
        colors = colors.slice(0, colors.length - 1);
        // TODO: All Debug checks for sizes
        if (colors.length !== width) throw "Invalid size of colors array " + colors.length + ", expected " + width;
        for (var x = 0; x < colors.length; x++) {
            data[currentRow * width * 4 + x * 4] = colors[x].r;
            data[currentRow * width * 4 + x * 4 + 1] = colors[x].g;
            data[currentRow * width * 4 + x * 4 + 2] = colors[x].b;
            data[currentRow * width * 4 + x * 4 + 3] = 255; // Use full alpha
        }
        currentRow++;
    }
    
    return result;
}()));

var output = function () {
    var image = new Jimp(width, height, 0x00ff00ff);
    image.scan(0, 0, width, height, function (x, y, idx) {
        this.bitmap.data[idx] =     data[(y - startY) * width * 4 + (x - startX) * 4];      // R
        this.bitmap.data[idx + 1] = data[(y - startY) * width * 4 + (x - startX) * 4 + 1];  // G
        this.bitmap.data[idx + 2] = data[(y - startY) * width * 4 + (x - startX) * 4 + 2];  // B
        this.bitmap.data[idx + 3] = data[(y - startY) * width * 4 + (x - startX) * 4 + 3];; // A
    });
    var end = new Date().getTime();
    log("Whole process took: " + (end - start) / 1000 + " seconds");
    image.write("out.bmp");
}