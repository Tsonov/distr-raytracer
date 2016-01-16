var express = require('express'),
    dirs = require('node-dir'),
    path = require('path');

var router = express.Router(),
    scenes;

// TODO: Could be better
var dataDir = "raytracer/data/";
dirs.files(dataDir, 'file', function (err, files) {
    if (err) throw err;

    scenes = files
        .filter(function (file) { return path.extname(file) === '.trinity' })
        .map(function (scenePath) {
        return { path: path.relative(dataDir, scenePath), name: path.basename(scenePath, '.trinity') }
    });
});

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { title: 'Dis.RayTracer', scenes: scenes });
});

module.exports = router;