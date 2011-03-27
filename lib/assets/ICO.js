var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Image = require('./Image');

function ICO(config) {
    Image.call(this, config);
}

util.inherits(ICO, Image);

_.extend(ICO.prototype, {
    contentType: 'image/x-icon', // Non-standard, but supported by IE

    defaultExtension: 'ico'
});

module.exports = ICO;
