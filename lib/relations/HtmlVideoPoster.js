/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HtmlVideoPoster(config) {
    Base.call(this, config);
}

util.inherits(HtmlVideoPoster, Base);

_.extend(HtmlVideoPoster.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('poster');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('poster', url);
    }
});

module.exports = HtmlVideoPoster;
