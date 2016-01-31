var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    uuid = require('uuid');

var router = express.Router();

router.get('/', function (req, res) {
    var scenePath = req.param("scenePath");
    if (scenePath) {
        // Existing scene
        // TODO: Validation and return 404
        fs.readFile(scenePath, 'utf8', function (err, contents) {
            // TODO: Show error pages for errors...
            if (err) throw err;
            var sceneData = {
                name: path.basename(scenePath, '.trinity'),
                contents: contents,
                scenePath: scenePath,
                canRename: false
            }
            res.render('scene', sceneData);
        })
    }
    else {
        // New scene
        // TODO: path
        var name = uuid.v4();
        var sceneData = {
            name: name,
            contents: "// Enter scene data here",
            scenePath: path.join("raytracer/data/", name + ".trinity"),
            canRename: true
        }
        res.render('scene', sceneData);
    }
    
});

module.exports = router;