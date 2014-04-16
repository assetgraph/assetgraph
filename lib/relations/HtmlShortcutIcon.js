var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlShortcutIcon(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlShortcutIcon, HtmlRelation);

extendWithGettersAndSetters(HtmlShortcutIcon.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'shortcut icon'); // Hmm, how to handle apple-touch-icon?
        if (position) {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        } else {
            // TODO: Consider moving this to HtmlRelation.prototype.attachNodeBeforeOrAfter
            var head = asset.parseTree.getElementsByTagName('head')[0];
            if (!head) {
                head = asset.parseTree.createElement('head');
                asset.parseTree.documentElement.insertBefore(head, asset.parseTree.documentElement.firstChild);
            }
            head.appendChild(this.node);
        }
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlShortcutIcon;
