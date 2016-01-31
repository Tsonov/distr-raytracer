var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    sceneManager = require('../lib/scene-manager.js');

var router = express.Router();

router.post('/', function (req, res) {
    var contents = req.body.sceneContents,
        name = req.body.sceneName,
        scenePath = sceneManager.getPathToScene(name);
    
    fs.writeFile(scenePath, contents, 'utf8', function (err, data) {
        if (err) throw err;

        res.redirect("/");
    })
});

module.exports = router;