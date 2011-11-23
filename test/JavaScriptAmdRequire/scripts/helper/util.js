define(["helper/yet/another"], function() {
    //This function is called when scripts/helper/util.js is loaded.
    alert("This is helper/util speaking!");
});

define('explicitName', ["helper/yet/another"], function () {
    alert("This is explicitName speaking!");
});

// Callback-less require
require(["helper/yet/another"]);
