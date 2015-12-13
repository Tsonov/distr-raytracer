var Jimp = require("jimp"),
    spawn = require("child_process").spawn,
    fs = require("fs"),
    split = require("split");

// TODO: Self-implement line splitter (or use one from past assignment)
var data;
var dataStr;
var l = console.log.bind(console);
var width = 255;
var height = 255 * 5;

var start = new Date().getTime();

var strToNums = function (str) {
    var wholeNum = parseInt(str, 10);
    var red = (wholeNum & (255 << 16)) >> 16;
    var green = (wholeNum & (255 < 8)) >> 8;
    var blue = wholeNum & 255;
    return { r: red, g: green, b: blue };
}


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

var render = spawn("TestInterop.exe");

if (fs.existsSync("out_piped.txt")) {
    fs.unlink("out_piped.txt");
}

data = new Uint8ClampedArray(height * width * 3); // 3 chanels for RGB

// Initiate rendering
render.stdin.write("begin\r\n");
// TODO: Do the split and line streaming in one stream instead of piping through split
var handler = render.stdout.pipe(split());
handler.on("data", (function () {
    var currentRow = 0;
    var result = function (line) {
        if (line.length == 0) return; // TODO: Figure if the empty row comes from the library implementation
        // TODO: Figure why is there an extra empty entry at the end
        var colors = line.split(" ").map(stringToColorNums);
        colors = colors.slice(0, colors.length - 1);
        // TODO: All Debug checks for sizes
        if (colors.length !== width) throw "Invalid size of colors array " + colors.length + ", expected " + width;
        for (var x = 0; x < colors.length; x++) {
            data[currentRow * width * 3 + x * 3] = colors[x].r;
            data[currentRow * width * 3 + x * 3 + 1] = colors[x].g;
            data[currentRow * width * 3 + x * 3 + 2] = colors[x].b;
        }
        currentRow++;
    }
    
    return result;
}()));

handler.on("close", function () {
    l("Closed");
    var image = new Jimp(width, height, 0xffffffff);
    
    image.scan(0, 0, width, height, function (x, y, idx) {
        this.bitmap.data[idx] = data[y * width * 3 + x * 3];      // R
        this.bitmap.data[idx + 1] = data[y * width * 3 + x * 3 + 1];  // G
        this.bitmap.data[idx + 2] = data[y * width * 3 + x * 3 + 2];  // B
        this.bitmap.data[idx + 3] = 255; // A, use full alpha
    }).write("out.bmp", function () {
        var end = new Date().getTime();
        l("Total time: " + (end - start) / 1000);
    });
})
