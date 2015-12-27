'use strict'

module.exports = exports = ImageMaster;

function ImageMaster(width, height) {
    if (!(this instanceof ImageMaster)) return new ImageMaster(width, height);
    
    // TODO: Validations
    this.width = width;
    this.height = height;
    this.image = new Buffer(this.width * this.height * ImageMaster.COLOR_SIZE);
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
                x: 0, 
                y: bucketHeight * i,
                width: this.width,
                height: bucketHeight
            });
        }
        // TODO: Floating point comparisons?
        if (bucketCount * bucketHeight < this.height) {
            // Add one more bucket with the leftovers
            result.push({
                x: 0,
                y: bucketCount * bucketHeight,
                width: this.width,
                height: this.height - (bucketCount * bucketHeight) // TODO: Check math here
            })
        }
    } else {
        // TODO: Better algorithm as well
        for (let i = 0; i < this.height; i++) {
            result.push({
                x: 0,
                y: i,
                width: this.width,
                height: 1
            })
        }
    }
    return result;
}

ImageMaster.prototype.handleResult = function (renderedResult) {
    var blockWidth = renderedResult.width,
        blockHeight = renderedResult.height,
        dx = renderedResult.dx,
        dy = renderedResult.dy;
    
    // TODO: Double-check math here
    renderedResult.bitmap.copy(this.image, dy * blockWidth * ImageMaster.COLOR_SIZE + dx * ImageMaster.COLOR_SIZE);
}

ImageMaster.prototype.getData = function () {
    // TODO: instead of creating copies, output directly to users?
    var imageData = new Buffer(this.image);
    return {
        width: this.width,
        height: this.height,
        imageData: imageData
    }
}

// TODO: Freeze if it should be a const
ImageMaster.COLOR_SIZE = 4; // RGBA, TODO: Make consistent with the raytracer and handle missing alpha