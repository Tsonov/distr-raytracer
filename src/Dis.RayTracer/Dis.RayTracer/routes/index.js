var express = require('express'),
    fs = require('fs'),
    path = require('path');

var router = express.Router(),
    // TODO: Could be better
    scenesDir = "raytracer/data/",
    scenes;


/* GET home page. */
router.get('/', function (req, res) {
    
    scenes = fs.readdirSync(scenesDir)
    .filter(function (file) { return path.extname(file) === '.trinity' })
    .map(function (sceneFile) {
        return {
            path: path.join(scenesDir, sceneFile),
            name: path.basename(sceneFile, '.trinity')
        }
    });
    res.render('index', { title: 'Dis.RayTracer', scenes: scenes });
});

module.exports = router;