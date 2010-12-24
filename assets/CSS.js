var util = require('util'),
    _ = require('underscore'),
    Sheet = require('Sheet').Sheet,
    Base = require('./Base');

var CSS = module.exports = function (config) {
    Base.call(this, config);
    this.sheet = new Sheet(this.src);
};

util.inherits(CSS, Base);
