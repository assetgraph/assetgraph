var util = require('util'),
    urlTools = require('urltools'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptCommonJsRequire(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptCommonJsRequire, Relation);

extendWithGettersAndSetters(JavaScriptCommonJsRequire.prototype, {
    hrefType: 'absolute',

    get href() {
        return urlTools.fsFilePathToFileUrl(this.node.args[0].value);
    },

    set href(href) {
        if (!/^file:/.test(href)) {
            throw new Error('JavaScriptCommonJsRequire.href setter: Only file:// urls are supported');
        }
        this.node.args[0].value = urlTools.fileUrlToFsPath(href);
    },

    inline: function () {
        throw new Error('JavaScriptCommonJsRequire.inline(): Not supported');
    },

    attach: function () {
        throw new Error('JavaScriptCommonJsRequire.attach(): Not supported');
    },

    detach: function () {
        throw new Error('JavaScriptCommonJsRequire.detach(): Not supported');
    }
});

module.exports = JavaScriptCommonJsRequire;
