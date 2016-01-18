

(function () {
    'use strict'
    
    var saveBtn = document.getElementById("save");
    
    saveBtn.addEventListener("click" , function () {
        var form = document.getElementById("sceneForm");
        form.submit();
    });
}());