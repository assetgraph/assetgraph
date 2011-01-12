/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function HTMLShortcutIcon(config) {
    Base.call(this, config);
}

util.inherits(HTMLShortcutIcon, Base);

_.extend(HTMLShortcutIcon.prototype, {
    setUrl: function (url) {
        this.tag.setAttribute('href', url);
    }
});

exports.HTMLShortcutIcon = HTMLShortcutIcon;
