/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HtmlShortcutIcon(config) {
    Base.call(this, config);
}

util.inherits(HtmlShortcutIcon, Base);

_.extend(HtmlShortcutIcon.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('href');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('href', url);
    },

    createNode: function (document) {
        var node = document.createElement('link');
        node.rel = 'shortcut icon'; // Hmm, how to handle apple-touch-icon?
        return node;
    }
});

module.exports = HtmlShortcutIcon;
