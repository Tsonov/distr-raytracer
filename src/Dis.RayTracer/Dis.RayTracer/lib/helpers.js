// Shorter version of console.log for lazy people (like the author)
exports.log = console.log.bind(console);

exports.curry = function (func) {
    var originalArgs = Array.prototype.slice.call(arguments, 1);
    return function () {
        var currentArgs = Array.prototype.slice.call(arguments, 0);
        return func.apply(this, originalArgs.concat(currentArgs));
    }
}