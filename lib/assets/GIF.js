var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Image = require('./Image');

function GIF(config) {
    Image.call(this, config);
}

util.inherits(GIF, Image);

_.extend(GIF.prototype, {
    contentType: 'image/gif',

    defaultExtension: '.gif'
});

module.exports = GIF;
