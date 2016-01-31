var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    sceneManager = require('../lib/scene-manager.js');

var router = express.Router(),
    scenes;


/* GET home page. */
router.get('/', function (req, res) {
    
    scenes = sceneManager.getSceneFiles().map(function (sceneFile) {
        return {
            path: sceneManager.getPathToScene(sceneFile),
            name: sceneManager.getSceneName(sceneFile)
        }
    });
    res.render('index', { title: 'Dis.RayTracer', scenes: scenes });
});

module.exports = router;