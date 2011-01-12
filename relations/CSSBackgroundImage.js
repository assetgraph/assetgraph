/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function CSSBackgroundImage(config) {
    Base.call(this, config);
}

util.inherits(CSSBackgroundImage, Base);

_.extend(CSSBackgroundImage.prototype, {
    remove: function () {
        // FIXME
    },

    setUrl: function (url) {
        // FIXME
    },

    inline: function (src) {
        // FIXME
    }
});

exports.CSSBackgroundImage = CSSBackgroundImage;
