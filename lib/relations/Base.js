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

    baseAssetQuery: {isInline: false},

    toString: function () {
        return "[" + this.type + "/" + this.id + ": " + ((this.from && this.to) ? this.from.toString() + " => " + this.to.toString() : "unattached") + "]";
    },

    attach: function (asset, position, adjacentRelation) {
        if (position === 'first') {
            asset.outgoingRelations.unshift(this);
        } else if (position === 'last') {
            asset.outgoingRelations.push(this);
        } else if (position === 'before' || position === 'after') { // before or after
            if (!adjacentRelation) {
                throw new Error("assets.Base.attachRelation: An adjacent relation is required for position === 'before'|'after'.");
            }
            if (this.type !== adjacentRelation.type) {
                throw new Error("assets.Base.attachRelation: Relation must have same type as adjacent relation.");
            }
            var adjacentRelationIndex = this.from.outgoingRelations.indexOf(adjacentRelation);
            if (adjacentRelationIndex === -1) {
                throw new Error("asset.Base.attachRelation: Adjacent relation not found.");
            }
            this.from.outgoingRelations.splice(adjacentRelationIndex + (position === 'after' ? 1 : 0), 0, this);
        } else {
            throw new Error("asset.Base.attachRelation: 'position' parameter must be either 'first', 'last', 'before', or 'after'.");
        }
        this.from.markDirty();
    },

    detach: function () {
        var indexInOutgoingRelations = this.from.outgoingRelations.indexOf(this);
        if (indexInOutgoingRelations === -1) {
            throw new Error("Css.detachRelation: Relation " + this + " not found in the outgoingRelations array");
        }
        this.from.outgoingRelations.splice(indexInOutgoingRelations, 1);
        this.from.markDirty();
    }
};

module.exports = Base;
