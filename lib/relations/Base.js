/*global exports, require*/
var _ = require('underscore'),
    uniqueId = require('../uniqueId'),
    query = require('../query');

function Base(config) {
    _.extend(this, config);
    this.id = uniqueId.nextId;
    uniqueId.nextId += 1;
}

_.extend(Base.prototype, {
    isRelation: true, // Avoid instanceof checks

    baseAssetQuery: {url: query.defined},

    toString: function () {
        return "[" + this.type + "/" + this.id + ": " + ((this.from && this.to) ? this.from.toString() + " => " + this.to.toString() : "unattached") + "]";
    }
});

module.exports = Base;
