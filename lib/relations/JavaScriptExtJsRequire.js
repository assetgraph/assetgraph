/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base'),
    query = require('../query');

function JavaScriptExtJsRequire(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptExtJsRequire, Base);

extendWithGettersAndSetters(JavaScriptExtJsRequire.prototype, {
    baseAssetQuery: {type: 'Html', url: query.isDefined},

    get href() {
        return this.node[1][2][0][1];
    },

    set href(url) {
        this.node[1][2][0][1] = url;
    }
});

module.exports = JavaScriptExtJsRequire;
