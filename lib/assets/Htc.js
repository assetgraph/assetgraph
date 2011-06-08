/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    Html = require('./Html');

function Htc(config) {
    Html.call(this, config);
}

util.inherits(Htc, Html);

_.extend(Htc.prototype, {
    contentType: 'text/x-component',

    defaultExtension: '.htc',

    alternativeExtensions: [] // Avoid reregistering xhtml etc.
});

module.exports = Htc;
