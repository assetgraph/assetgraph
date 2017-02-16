var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function MsApplicationConfigPollingUri(config) {
    Relation.call(this, config);
}

util.inherits(MsApplicationConfigPollingUri, Relation);

extendWithGettersAndSetters(MsApplicationConfigPollingUri.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    inline: function () {
        throw new Error('MsApplicationConfigPollingUri.inline: Not supported');
    },

    attach: function () {
        throw new Error('MsApplicationConfigPollingUri.attach: Not supported');
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        this.node = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = MsApplicationConfigPollingUri;
