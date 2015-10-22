var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    JavaScriptAmdRequire = require('./JavaScriptAmdRequire');

function JavaScriptRequireJsCommonJsCompatibilityRequire(config) {
    JavaScriptAmdRequire.call(this, config);
}

util.inherits(JavaScriptRequireJsCommonJsCompatibilityRequire, JavaScriptAmdRequire);

extendWithGettersAndSetters(JavaScriptRequireJsCommonJsCompatibilityRequire.prototype, {
    get rawHref() {
        return this.node.arguments[0].value;
    },

    set rawHref(rawHref) {
        this.node.arguments[0].value = rawHref;
    },

    attach: function () {
        throw new Error('JavaScriptRequireJsCommonJsCompatibilityRequire.attach(): Not supported');
    },

    detach: function () {
        throw new Error('JavaScriptRequireJsCommonJsCompatibilityRequire.detach(): Not supported');
    }
});

module.exports = JavaScriptRequireJsCommonJsCompatibilityRequire;
