var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function SystemJsBundle(config) {
    Relation.call(this, config);
}

util.inherits(SystemJsBundle, Relation);

extendWithGettersAndSetters(SystemJsBundle.prototype, {
    inline: function () {
        throw new Error('SystemJsBundle.inline(): Not supported');
    }
});

module.exports = SystemJsBundle;
