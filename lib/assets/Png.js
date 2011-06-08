var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Image = require('./Image');

function Png(config) {
    Image.call(this, config);
}

util.inherits(Png, Image);

_.extend(Png.prototype, {
    contentType: 'image/png',

    defaultExtension: '.png'
});

module.exports = Png;
