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
        this.node.setAttribute('src', url);
    }
});

HTMLIFrame.createNodeForAsset = function (document, asset) {
    return document.createElement('img');
};

exports.HTMLImage = HTMLImage;
