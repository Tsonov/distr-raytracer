var socketio = require("socket.io"),
    Jimp = require("jimp");
    //spawn = require("chi;

var data;
var dataStr;
var l = console.log.bind(console);
var width = 255;
var height = 255;

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
    var red = (wholeNum & (255 << redShift)) >> redShift;
    var green = (wholeNum & (255 << greenShift)) >> greenShift;
    var blue = (wholeNum & (255 << blueShift)) >> blueShift;
    var alpha = hasAlpha ? (wholeNum & 255) : -1;
    return { r: red, g: green, b: blue, a: alpha };
}

var stringToColorNums = function(unsignedAsString) {
    return unsignedColorToNums(parseInt(unsignedAsString, 10));
}


//data = new Uint8ClampedArray(height * width * 3); // 3 chanels for RGB
dataStr = [];
for (var i = 0; i < height; i++) {
    dataStr.push([]);
    for (var j = 0; j < width; j++) {
        var red = i;
        var blue = j;
        var number = (red << 16) + blue;
        dataStr[i].push(number.toString());
    };
    l("{ " + dataStr[i].join(", ") + "} ,");
};

//dataStr // h * w
//data // h * w * 3

//for (var i = 0; i < height; i++) {
//    for (var j = 0; j < width; j++) {
//        var strNum = dataStr[i][j];
//        var rgb = strToNums(strNum);
//        data[i * width * 3 + j * 3] = rgb.r;
//        data[i * width * 3 + j * 3 + 1] = rgb.g;
//        data[i * width * 3 + j * 3 + 2] = rgb.b;
//    };
//};



//var image = new Jimp(height, width, 0xffffffff);

//image.scan(0, 0, height, width, function (x, y, idx) {
//    this.bitmap.data[idx]     = data[y * width * 3 + x * 3];      // R
//    this.bitmap.data[idx + 1] = data[y * width * 3 + x * 3 + 1];  // G
//    this.bitmap.data[idx + 2] = data[y * width * 3 + x * 3 + 2];  // B
//    this.bitmap.data[idx + 3] = 255; // A, use full alpha
//}).write("out.bmp");
