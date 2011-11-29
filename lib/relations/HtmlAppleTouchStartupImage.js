/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlAppleTouchShortcutIcon(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlAppleTouchShortcutIcon, HtmlRelation);

extendWithGettersAndSetters(HtmlAppleTouchShortcutIcon.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'apple-touch-startup-image'); // Hmm, how to handle apple-touch-icon?
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlAppleTouchShortcutIcon;
