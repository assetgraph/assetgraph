/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Html = require('./Html');

function Htc(config) {
    Html.call(this, config);
}

util.inherits(Htc, Html);

extendWithGettersAndSetters(Htc.prototype, {
    contentType: 'text/x-component',

    supportedExtensions: ['.htc']
});

module.exports = Htc;
