/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    query = require('../query'),
    Base = require('./Base');

function JavaScriptOneGetText(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptOneGetText, Base);

_.extend(JavaScriptOneGetText.prototype, {
    baseAssetQuery: {type: 'Html', url: query.isDefined},

    _getRawUrlString: function () {
        return this.node[2][0][1];
    },

    _setRawUrlString: function (url) {
        this.node[2][0][1] = url;
    }
});

module.exports = JavaScriptOneGetText;
