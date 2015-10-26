var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function SystemJsLazyBundle(config) {
    Relation.call(this, config);
}

util.inherits(SystemJsLazyBundle, Relation);

extendWithGettersAndSetters(SystemJsLazyBundle.prototype, {
    inline: function () {
        throw new Error('SystemJsLazyBundle.inline(): Not supported');
    },

    set href(href) {
        this.node.key = { type: 'Literal', value: href };
    },

    get href() {
        return this.node.key.value || this.node.key.name;
    }
});

module.exports = SystemJsLazyBundle;
