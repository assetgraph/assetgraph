var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function Image (config) {
    Base.call(this, config);
}

util.inherits(Image, Base);

_.extend(Image.prototype, {
    encoding: 'binary'
});

exports.Image = Image;
