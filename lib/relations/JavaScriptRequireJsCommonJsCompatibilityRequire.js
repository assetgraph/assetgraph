/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    JavaScriptAmdRequire = require('./JavaScriptAmdRequire');

function JavaScriptRequireJsCommonJsCompatibilityRequire(config) {
    JavaScriptAmdRequire.call(this, config);
}

util.inherits(JavaScriptRequireJsCommonJsCompatibilityRequire, JavaScriptAmdRequire);

extendWithGettersAndSetters(JavaScriptRequireJsCommonJsCompatibilityRequire.prototype, {
    get href() {
        return this.node.args[0].value;
    },

    set href(href) {
        this.node.args[0].value = href;
    },

    attach: function () {
        throw new Error("JavaScriptRequireJsCommonJsCompatibilityRequire.attach(): Not supported");
    },

    detach: function () {
        throw new Error("JavaScriptRequireJsCommonJsCompatibilityRequire.detach(): Not supported");
    }
});

module.exports = JavaScriptRequireJsCommonJsCompatibilityRequire;
