/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    HTML = require('./HTML');

var HTC = module.exports = function (config) {
    HTML.call(config);
};

util.inherits(HTC, HTML);
