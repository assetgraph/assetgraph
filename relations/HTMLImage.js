/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function HTMLImage(config) {
    Base.call(this, config);
}

util.inherits(HTMLImage, Base);

_.extend(HTMLImage.prototype, {
    setUrl: function (url) {
        this.tag.setAttribute('src', url);
    }
});

exports.HTMLImage = HTMLImage;
