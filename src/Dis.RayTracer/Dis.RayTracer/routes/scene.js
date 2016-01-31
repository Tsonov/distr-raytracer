var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    uuid = require('uuid'),
    sceneManager = require('../lib/scene-manager.js');

var router = express.Router();

router.get('/', function (req, res) {
    var scenePath = req.param("scenePath");
    if (scenePath) {
        // Existing scene
        if (fs.existsSync(scenePath) === false) {
            res.status(404).send("Scene does not exist");
        } else {
            fs.readFile(scenePath, 'utf8', function (err, contents) {
                if (err) throw err;
                var sceneData = {
                    name: sceneManager.getSceneName(scenePath),
                    contents: contents,
                    scenePath: scenePath,
                    canRename: false
                }
                res.render('scene', sceneData);
            })
        }
        
    }
    else {
        // New scene
        var name = uuid.v4();
        var sceneData = {
            name: name,
            contents: "// Enter scene data here",
            scenePath: sceneManager.getPathToScene(name),
            canRename: true
        }
        res.render('scene', sceneData);
    }
    
});

module.exports = router;