var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { title: 'Dis.RayTracer', scenes: [{ path: "data/lecture4.trinity", name: "lecture4" }, { path: "data/hw9/nonconvex.trinity", name: "nonconvex" }] });
});

module.exports = router;