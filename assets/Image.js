var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

var Image = module.exports = function (config) {
    Base.call(this, config);
};

util.inherits(Image, Base);

_.extend(Image.prototype, {
    encoding: 'binary'
});
