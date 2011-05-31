/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base'),
    query = require('../query');

function JavaScriptExtJS4Include(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptExtJS4Include, Base);

_.extend(JavaScriptExtJS4Include.prototype, {
    baseAssetQuery: {type: 'HTML', url: query.isDefined},

    _getRawUrlString: function () {
        return this.node[1][2][0][1];
    },

    _setRawUrlString: function (url) {
        this.node[1][2][0][1] = url;
    }
});

module.exports = JavaScriptExtJS4Include;
