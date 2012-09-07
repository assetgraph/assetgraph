/*global require, module*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Html = require('./Html');

function KnockoutJsTemplate(config) {
    Html.call(this, config);
}

util.inherits(KnockoutJsTemplate, Html);

extendWithGettersAndSetters(KnockoutJsTemplate.prototype, {
    contentType: null, // Avoid reregistering text/html

    defaultExtension: '.ko',

    alternativeExtensions: [] // Avoid reregistering xhtml etc.
});

module.exports = KnockoutJsTemplate;
