var util = require('util'),
    _ = require('underscore'),
    uglify = require('uglify-js'),
    uglifyAst = require('../util/uglifyAst'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    relations = require('../relations'),
    Base = require('./Base'),
    urlTools = require('../util/urlTools');

function StaticUrlMap(config) {
    Base.call(this, config);
    if (!this._parseTree) {
        throw new Error("assets.StaticUrlMap: parseTree config option is mandatory");
    }

    if (this._parseTree[0][0] === 'string') {
        // one.getStaticUrl('foo/bar', ...);
        var url = this._parseTree[0][1];

        this.originalWildCardRelation = new relations.StaticUrlMapEntry({
            from: this,
            href: url,
            to: url
        });

        this._outgoingRelations = [this.originalWildCardRelation];

        this.wildCardValueAsts = this._parseTree.slice(1);
    } else if (this._parseTree[0][0] === 'sub') {
        // one.getStaticUrl({foo: "bar"}[...]);

        this.relationByWildCardValues = {};
        this.wildCardValueAsts = [];
        var cursor = this._parseTree[0];

        while (cursor[0] === 'sub') {
            this.wildCardValueAsts.push(cursor[2]);
            cursor = cursor[1];
        }
        this._outgoingRelations = [];
        var keys = [],
            populateUrlByWildCardValues = function (node, relationByWildCardValuesCursor, nestingLevel) {
                if (nestingLevel > this.wildCardValueAsts.length || !node || node[0] !== 'object') {
                    throw new Error("assets.StaticUrlMap: Unsupported syntax: " + uglify.uglify.gen_code(this._parseTree[0]));
                }
                for (var i = 0 ; i < node[1].length ; i += 1) {
                    var key = node[1][i][0];
                    if (node[1][i][1][0] === 'string') {
                        if (nestingLevel !== this.wildCardValueAsts.length) {
                            throw new Error("assets.StaticUrlMap: Unsupported syntax: " + uglify.uglify.gen_code(this._parseTree[0]));
                        }
                        relationByWildCardValuesCursor[key] = new relations.StaticUrlMapEntry({
                            from: this,
                            href: node[1][i][1][1],
                            wildCardValues: [].concat(keys),
                            to: node[1][i][1][1]
                        });
                        this._outgoingRelations.push(relationByWildCardValuesCursor[key]);
                    } else {
                        // 'object'
                        relationByWildCardValuesCursor[key] = relationByWildCardValuesCursor[key] || {};
                        keys.push(key);
                        populateUrlByWildCardValues(node[1][i][1], relationByWildCardValuesCursor[key], nestingLevel + 1);
                        keys.pop(key);
                    }
                }
            }.bind(this);

        populateUrlByWildCardValues(cursor, this.relationByWildCardValues, 1);
    } else {
        throw new Error("assets.StaticUrlMap: Unsupported syntax: " + uglify.uglify.gen_code(this._parseTree[0]));
    }
}

util.inherits(StaticUrlMap, Base);

extendWithGettersAndSetters(StaticUrlMap.prototype, {
    type: 'StaticUrlMap',

    _attachRelationWithWildCardValues: function (relation) {
        if (relation.wildCardValues.length !== this.wildCardValueAsts.length) {
            throw new Error("assets.StaticUrlMap._attachRelationWithWildCardValues: Relation has the wrong number of wildcard values");
        }
        if (this.wildCardValueAsts.length === 0) {
            if (this.relationByWildCardValues) {
                throw new Error("assets.StaticUrlMap._attachRelationWithWildCardValues: Cannot attach multiple relations to StaticUrlMap without wildcards.");
            }
            this.relationByWildCardValues = relation;
        } else {
            if (!this.relationByWildCardValues) {
                this.relationByWildCardValues = {};
            } else if (this.relationByWildCardValues.isRelation) {
                if (this.relationByWildCardValues.href.indexOf('*') === -1) {
                    throw new Error("assets.StaticUrlMap._attachRelationWithWildCardValues: Cannot overwrite non-wildcard relation.");
                }
                this.relationByWildCardValues = {};
            }
            var cursor = this.relationByWildCardValues;
            relation.wildCardValues.forEach(function (wildCardValue, i) {
                if (i === this.wildCardValueAsts.length - 1) {
                    cursor[wildCardValue] = relation;
                } else {
                    if (!(wildCardValue in cursor)) {
                        cursor[wildCardValue] = {};
                    }
                    cursor = cursor[wildCardValue];
                }
            }, this);
        }
    },

    attachRelation: function (relation, position, adjacentRelation) {
        // This happens after wildcard expansion, adjacentRelation is the one with the wildcard
        if (relation.wildCardValues) {
            this._attachRelationWithWildCardValues(relation);
        } else if (adjacentRelation) {
            var wildCardValuesRegExp = new RegExp(adjacentRelation.href.replace(/^[^\*]*?\//, "").replace(/\./g, "\\.").replace(/\*\*?/g, "([^\/]+)") + "$"),
                matchWildCardValues = relation.to.url.match(wildCardValuesRegExp);
            if (matchWildCardValues) {
                relation.wildCardValues = Array.prototype.slice.call(matchWildCardValues, 1);
                this._attachRelationWithWildCardValues(relation);
            } else {
                throw new Error("assets.StaticUrlMap.attachRelation: Couldn't get wild card values");
            }
        } else {
            throw new Error("assets.StaticUrlMap.attachRelation: The relation must have an adjacentRelation or a wildCardValues property");
        }
        Base.prototype.attachRelation.call(this, relation, position, adjacentRelation);
    },

    detachRelation: function (relation) {
        if (relation.wildCardValues) {
            var cursor = this.relationByWildCardValues;
            relation.wildCardValues.forEach(function (wildCardValue, i) {
                if (i === this.wildCardValueAsts.length - 1) {
                    if (wildCardValue in cursor) {
                        delete cursor[wildCardValue];
                    } else {
                        throw new Error("assets.StaticUrlMap.detachRelation: The relation's set of wild card values aren't mapped.");
                    }
                } else {
                    if (!(wildCardValue in cursor)) {
                        throw new Error("assets.StaticUrlMap.detachRelation: The relation's set of wild card values aren't mapped.");
                    }
                    cursor = cursor[wildCardValue];
                }
            });
        } else if (relation !== this.originalWildCardRelation) {
            throw new Error("assets.StaticUrlMap.detachRelation: Cannot detach relation without wildCardValues property or asterisks in its href");
        }
        Base.prototype.detachRelation.call(this, relation);
    },

    toAst: function () {
        var expressionAst = (function convert(obj) {
            if (obj.isRelation) {
                return ['string', obj.href];
            } else {
                return ['object', _.map(obj, function (value, key) {
                    return [key, convert(value)];
                })];
            }
        }(this.relationByWildCardValues || this.originalWildCardRelation));
        this.wildCardValueAsts.forEach(function (wildCardValueAst) {
            expressionAst = ['sub', expressionAst, wildCardValueAst];
        });
        return expressionAst;
    }
});

module.exports = StaticUrlMap;
