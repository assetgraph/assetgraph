var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Image = require('./Image');

function JPEG(config) {
    Image.call(this, config);
}

util.inherits(JPEG, Image);

_.extend(JPEG.prototype, {
    contentType: 'image/jpeg',

    defaultExtension: '.jpg',

    alternativeExtensions: ['.jpeg']

});

module.exports = JPEG;
