var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Image = require('./Image');

function Gif(config) {
    Image.call(this, config);
}

util.inherits(Gif, Image);

_.extend(Gif.prototype, {
    contentType: 'image/gif',

    defaultExtension: '.gif'
});

module.exports = Gif;
