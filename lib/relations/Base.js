/*global exports, require*/
var _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    urlTools = require('../util/urlTools'),
    uniqueId = require('../util/uniqueId'),
    query = require('../query');

function Base(config) {
    _.extend(this, config);
    this.id = uniqueId();
}

Base.prototype = {
    isRelation: true, // Avoid instanceof checks

    baseAssetQuery: {url: query.isDefined},

    toString: function () {
        return "[" + this.type + "/" + this.id + ": " + ((this.from && this.to) ? this.from.toString() + " => " + this.to.toString() : "unattached") + "]";
    }
};

module.exports = Base;
