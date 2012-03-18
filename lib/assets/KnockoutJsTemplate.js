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
    contentType: null, // Avoid reregisting text/html

    defaultExtension: '.ko',

    alternativeExtensions: [], // Avoid reregistering xhtml etc.

    minify: function () {
        this._reformatParseTree(true, false); // Don't strip comments (they're used by the templating logic)
        this.isPretty = false;
        this.markDirty();
        return this;
    }
});

module.exports = KnockoutJsTemplate;
