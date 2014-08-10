var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HttpRedirect(config) {
    Relation.call(this, config);
}

util.inherits(HttpRedirect, Relation);

extendWithGettersAndSetters(HttpRedirect.prototype, {});

module.exports = HttpRedirect;
