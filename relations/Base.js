var _ = require('underscore');

function Relation(config) {
    _.extend(this, config || {});
}

Relation.prototype = {
};
