var express = require('express'),
    dirs = require('node-dir')
path = require('path');

var router = express.Router(),
    scenes;

// TODO: Could be better
dirs.files("raytracer/data/", 'file', function (err, files) {
    if (err) throw err;
    
    scenes = files
        .filter(function (file) { return path.extname(file) === '.trinity' })
        .map(function (scenePath) {
        return { path: path.basename(scenePath), name: path.basename(scenePath, '.trinity') }
    });
});

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { title: 'Dis.RayTracer', scenes: scenes });
});

module.exports = router;