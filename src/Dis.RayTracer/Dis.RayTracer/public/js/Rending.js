
// Polyfill from MDN 
if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (predicate) {
        if (this === null) {
            throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;
        
        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return i;
            }
        }
        return -1;
    };
}

var fillCanvasWithData = function (context, colorBuffer, width, height, dx, dy) {
    var img = context.createImageData(width, height),
        colorArr = new Uint8ClampedArray(colorBuffer);
    if (colorArr.length !== width * height * 4) throw "Unexpected color array length, expected " + width * height * 4 + " but got " + colorArr.length;
    
    img.data.set(colorArr);
    context.putImageData(img, dx, dy);
}