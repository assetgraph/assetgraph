/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base'),
    query = require('../query');

function JavaScriptExtJsRequire(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptExtJsRequire, Base);

_.extend(JavaScriptExtJsRequire.prototype, {
    baseAssetQuery: {type: 'Html', url: query.isDefined},

    _getRawUrlString: function () {
        return this.node[1][2][0][1];
    },

    _setRawUrlString: function (url) {
        this.node[1][2][0][1] = url;
    }
});

module.exports = JavaScriptExtJsRequire;
