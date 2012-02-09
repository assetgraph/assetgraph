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
    // Make sure that urls are interpreted as relative to the "main" Html document:
    baseAssetQuery: {
        type: 'Html'
    },

    contentType: null, // Avoid reregisting text/html

    defaultExtension: '.ko',

    alternativeExtensions: [] // Avoid reregistering xhtml etc.
});

module.exports = KnockoutJsTemplate;
