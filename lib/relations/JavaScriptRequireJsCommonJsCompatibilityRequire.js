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
    get rawHref() {
        return this.node.args[0].value;
    },

    set rawHref(rawHref) {
        // This tends to break badly because the JavaScriptRequireJsCommonJsCompatibilityRequire relations
        // need to be "linked" to JavaScriptAmdDefine relations. Not sure what exactly to do about that yet.
        // this.node.args[0].value = rawHref;
    },

    attach: function () {
        throw new Error("JavaScriptRequireJsCommonJsCompatibilityRequire.attach(): Not supported");
    },

    detach: function () {
        throw new Error("JavaScriptRequireJsCommonJsCompatibilityRequire.detach(): Not supported");
    }
});

module.exports = JavaScriptRequireJsCommonJsCompatibilityRequire;
