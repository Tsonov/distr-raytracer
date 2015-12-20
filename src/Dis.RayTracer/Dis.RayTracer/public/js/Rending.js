'use strict'


(function () {
        /* Assumes socket.io is included */ 
        var renderBtn = document.getElementById("startRendering");
        renderBtn.onclick = function () {
            // TODO: Fix the hardcoded value
            var socket = io("http://localhost:1337/client-ns");
        }
    }());