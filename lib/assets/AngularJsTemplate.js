/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Html = require('./Html');

function AngularJsTemplate(config) {
    Html.call(this, config);
}

util.inherits(AngularJsTemplate, Html);

extendWithGettersAndSetters(AngularJsTemplate.prototype, {
    contentType: 'text/ng-template',

    supportedExtensions: []
});

module.exports = AngularJsTemplate;
