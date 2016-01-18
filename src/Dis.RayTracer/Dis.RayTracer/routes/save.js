var express = require('express'),
    fs = require('fs'),
    path = require('path');
var router = express.Router();

router.post('/', function (req, res) {
    // TODO: Validation and return 404
    var scenePath = req.param("scenePath"),
        contents = req.body.sceneContents;
    fs.writeFile(scenePath, contents, 'utf8', function (err, data) {
        // TODO: Show error pages for errors...
        if (err) throw err;

        res.redirect("/");
    })
});

module.exports = router;