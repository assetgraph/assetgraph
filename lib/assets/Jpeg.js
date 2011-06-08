var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Image = require('./Image');

function Jpeg(config) {
    Image.call(this, config);
}

util.inherits(Jpeg, Image);

_.extend(Jpeg.prototype, {
    contentType: 'image/jpeg',

    defaultExtension: '.jpg',

    alternativeExtensions: ['.jpeg']

});

module.exports = Jpeg;
