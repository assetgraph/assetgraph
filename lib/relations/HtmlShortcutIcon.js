/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlShortcutIcon(config) {
    Relation.call(this, config);
}

util.inherits(HtmlShortcutIcon, Relation);

extendWithGettersAndSetters(HtmlShortcutIcon.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    createNode: function (document) {
        var node = document.createElement('link');
        node.rel = 'shortcut icon'; // Hmm, how to handle apple-touch-icon?
        return node;
    }
});

module.exports = HtmlShortcutIcon;
