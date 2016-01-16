exports.log = console.log.bind(console);

exports.unsignedColorToNums = unsignedColorToNums = function (number, hasAlpha) {
    hasAlpha = hasAlpha || false;
    var redShift = hasAlpha ? 24 : 16,
        greenShift = hasAlpha ? 16 : 8,
        blueShift = hasAlpha ? 8 : 0,
        red = (number & (255 << redShift)) >> redShift,
        green = (number & (255 << greenShift)) >> greenShift,
        blue = (number & (255 << blueShift)) >> blueShift,
        alpha = hasAlpha ? (number & 255) : -1;
    
    return { r: red, g: green, b: blue, a: alpha };
}

exports.stringToColorNums = function (unsignedAsString) {
    return unsignedColorToNums(parseInt(unsignedAsString, 10));
}