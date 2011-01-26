var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Image = require('./Image').Image;

function GIF(config) {
    Image.call(this, config);
}

util.inherits(GIF, Image);

_.extend(GIF.prototype, {
    contentType: 'image/gif'
});

exports.GIF = GIF;
