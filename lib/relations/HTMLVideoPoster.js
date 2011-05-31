/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HTMLVideoPoster(config) {
    Base.call(this, config);
}

util.inherits(HTMLVideoPoster, Base);

_.extend(HTMLVideoPoster.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('poster');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('poster', url);
    }
});

module.exports = HTMLVideoPoster;
