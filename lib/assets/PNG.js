var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Image = require('./Image');

function PNG(config) {
    Image.call(this, config);
}

util.inherits(PNG, Image);

_.extend(PNG.prototype, {
    contentType: 'image/png',

    defaultExtension: 'png'
});

module.exports = PNG;
