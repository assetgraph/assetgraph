const util = require('util');
const extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters');
const Relation = require('./Relation');

function FileRedirect(config) {
    Relation.call(this, config);
}

util.inherits(FileRedirect, Relation);

extendWithGettersAndSetters(FileRedirect.prototype, {});

module.exports = FileRedirect;
