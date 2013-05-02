/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    JavaScriptAmdRequire = require('./JavaScriptAmdRequire');

function JavaScriptShimRequire(config) {
    this.node = {value: config.href};
    JavaScriptAmdRequire.call(this, config);
}

util.inherits(JavaScriptShimRequire, JavaScriptAmdRequire);

extendWithGettersAndSetters(JavaScriptShimRequire.prototype, {
    attach: function () {
        throw new Error("JavaScriptShimRequire.attach(): Not supported");
    },

    detach: function () {
        throw new Error("JavaScriptShimRequire.detach(): Not supported");
    }
});

module.exports = JavaScriptShimRequire;
