var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function Image (config) {
    Base.call(this, config);
}

util.inherits(Image, Base);

_.extend(Image.prototype, {
    encoding: 'binary',

    serialize: function (cb) {
        this.getOriginalSrc(error.passToFunction(cb, function (src) {
            cb(null, src);
        }));
    }
});

exports.Image = Image;
