var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Image = require('./Image');

function Ico(config) {
    Image.call(this, config);
}

util.inherits(Ico, Image);

_.extend(Ico.prototype, {
    contentType: 'image/x-icon', // Non-standard, but supported by IE

    defaultExtension: '.ico'
});

module.exports = Ico;
