var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function StaticUrlMapEntry(config) {
    Relation.call(this, config);
}

util.inherits(StaticUrlMapEntry, Relation);

extendWithGettersAndSetters(StaticUrlMapEntry.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false, isFragment: false},

    inline: function () {
        throw new Error('StaticUrlMapEntry.inline(): Not supported');
    },

    attach: function (asset, position, adjacentRelation) {
        position = position || 'last'; // FIXME?
        if (adjacentRelation && !this.wildCardValues) {
            // ? wildcards disabled because they're indistinguishable from GET parameters. This should work though (after the [\.\+] replace): .replace(/\?/g, '(.)')
            var wildCardValuesRegExp = new RegExp('^' + adjacentRelation.to.url.replace(/%7B/g, '{').replace(/%7D/g, '}').replace(/[\.\+\?]/g, '\\$&').replace(/\/\*\*\//g, '(?:\/(.+?))?\/').replace(/\*/g, '([^/]*?)').replace(/\{([^\}]*)\}/g, function ($0, $1) {
                    // {foo,bar} type wildcards
                    return '(' + $1.replace(/,/g, '|') + ')';
                }) + '$'),
                matchWildCardValues = this.to.url.match(wildCardValuesRegExp);
            if (matchWildCardValues) {
                // Map undefined to '' so ** that don't match anything get a sane value:
                this.wildCardValues = Array.prototype.slice.call(matchWildCardValues, 1).map(function (wildCardValue) {
                    return wildCardValue || '';
                });
            } else {
                throw new Error('relations.StaticUrlMapEntry.attach: Couldn\'t get wild card values');
            }
        }
        // This happens after wildcard expansion, adjacentRelation is the one with the wildcard
        if (this.wildCardValues) {
            if (this.wildCardValues.length !== asset.wildCardValueAsts.length) {
                throw new Error('relations.StaticUrlMapEntry.attach: Relation has the wrong number of wildcard values');
            }
            if (asset.wildCardValueAsts.length === 0) {
                if (asset.relationByWildCardValues) {
                    throw new Error('relations.StaticUrlMapEntry.attach: Cannot attach multiple relations to StaticUrlMap without wildcards.');
                }
                asset.relationByWildCardValues = this;
            } else {
                if (!asset.relationByWildCardValues) {
                    asset.relationByWildCardValues = {};
                } else if (asset.relationByWildCardValues.isRelation) {
                    if (this.relationByWildCardValues.href.indexOf('*') === -1) {
                        throw new Error('relations.StaticUrlMapEntry.attach: Cannot overwrite non-wildcard relation.');
                    }
                    this.relationByWildCardValues = {};
                }
                var cursor = asset.relationByWildCardValues;
                this.wildCardValues.forEach(function (wildCardValue, i) {
                    if (i === asset.wildCardValueAsts.length - 1) {
                        cursor[wildCardValue] = this;
                    } else {
                        if (!(wildCardValue in cursor)) {
                            cursor[wildCardValue] = {};
                        }
                        cursor = cursor[wildCardValue];
                    }
                }, this);
            }
        } else {
            throw new Error('relations.StaticUrlMapEntry.attach: The relation must have an adjacentRelation or a wildCardValues property');
        }
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        if (this.wildCardValues) {
            var cursor = this.from.relationByWildCardValues;
            this.wildCardValues.forEach(function (wildCardValue, i) {
                if (i === this.from.wildCardValueAsts.length - 1) {
                    if (wildCardValue in cursor) {
                        delete cursor[wildCardValue];
                    } else {
                        throw new Error('relations.StaticUrlMapEntry.detach: The relation\'s set of wild card values aren\'t mapped.');
                    }
                } else {
                    if (!(wildCardValue in cursor)) {
                        throw new Error('relations.StaticUrlMapEntry.detach: The relation\'s set of wild card values aren\'t mapped.');
                    }
                    cursor = cursor[wildCardValue];
                }
            });
        } else if (this !== this.from.originalWildCardRelation) {
            throw new Error('relations.StaticUrlMapEntry.detach: Cannot detach relation without wildCardValues property or asterisks in its href');
        }
        return Relation.prototype.detach.call(this);
    }
});

module.exports = StaticUrlMapEntry;
