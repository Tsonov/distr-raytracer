var express = require('express'),
    fs = require('fs'),
    path = require('path');
var router = express.Router();

router.get('/', function (req, res) {
    // TODO: Validation and return 404
    var scenePath = req.param("scenePath");
    fs.readFile(scenePath, 'utf8', function (err, contents) {
        // TODO: Show error pages for errors...
        if (err) throw err;
        var sceneData = {
            title: "Currently editing scene: " + path.basename(scenePath, '.trinity'),
            contents: contents,
            scenePath: scenePath
        }
        res.render('scene', sceneData);
    })
});

module.exports = router;