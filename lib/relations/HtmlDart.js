/*global require*/
var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlScript = require('./HtmlScript');

function HtmlDart(config) {
    HtmlScript.call(this, config);
}

util.inherits(HtmlDart, HtmlScript);

extendWithGettersAndSetters(HtmlDart.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    /**
     * Dart doesn’t support inline scripts (scripts defined inside the HTML page).
     * While an inline script technically works in Dartium (a build of Chromium with the Dart VM),
     * the Dart-to-JavaScript compiler (dart2js) doesn’t work with inline scripts.
     * https://www.dartlang.org/articles/embedding-in-html/
     */
    inline: function () {
        return this;
    }
});

module.exports = HtmlDart;
