var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Image = require('./Image').Image;

function JPEG(config) {
    Image.call(this, config);
}

util.inherits(JPEG, Image);

_.extend(JPEG.prototype, {
    contentType: 'image/jpeg',

    defaultExtension: 'jpg',

    alternativeExtensions: ['jpeg']

});

exports.JPEG = JPEG;
