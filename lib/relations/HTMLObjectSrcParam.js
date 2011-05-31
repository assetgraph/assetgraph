/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HTMLObjectSrcParam(config) {
    Base.call(this, config);
}

util.inherits(HTMLObjectSrcParam, Base);

_.extend(HTMLObjectSrcParam.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('value');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('value', url);
    }
});

module.exports = HTMLObjectSrcParam;
