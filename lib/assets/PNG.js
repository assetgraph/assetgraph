var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Image = require('./Image').Image;

function PNG(config) {
    Image.call(this, config);
}

util.inherits(PNG, Image);

_.extend(PNG.prototype, {
    contentType: 'image/png'
});

exports.PNG = PNG;
