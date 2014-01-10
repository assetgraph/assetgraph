/*global require*/
var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlDart(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlDart, HtmlRelation);

extendWithGettersAndSetters(HtmlDart.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    /**
     * Dart doesn’t support inline scripts (scripts defined inside the HTML page).
     * While an inline script technically works in Dartium (a build of Chromium with the Dart VM),
     * the Dart-to-JavaScript compiler (dart2js) doesn’t work with inline scripts.
     * https://www.dartlang.org/articles/embedding-in-html/
     */
    inline: function () {
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('script');
        this.node.setAttribute('type', this.to.contentType);
        if (position === 'first') {
            var existingScriptNodes = asset.parseTree.getElementsByTagName('script');
            if (existingScriptNodes.length > 0) {
                existingScriptNodes[0].parentNode.insertBefore(this.node, existingScriptNodes[0]);
            } else if (asset.parseTree.body) {
                asset.parseTree.body.insertBefore(this.node, asset.parseTree.body.firstChild);
            } else {
                asset.parseTree.head.appendChild(this.node);
            }
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlDart;
