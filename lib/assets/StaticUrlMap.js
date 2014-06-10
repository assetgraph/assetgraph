var util = require('util'),
    _ = require('lodash'),
    AssetGraph = require('../'),
    uglifyJs = require('./JavaScript').uglifyJs,
    errors = require('../errors'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset');

function StaticUrlMap(config) {
    Asset.call(this, config);
    if (!this._parseTree) {
        throw new Error('StaticUrlMap: parseTree config option is mandatory');
    }
}

util.inherits(StaticUrlMap, Asset);

extendWithGettersAndSetters(StaticUrlMap.prototype, {
    type: 'StaticUrlMap',

    contentType: null, // Avoid reregistering application/octet-stream

    supportedExtensions: [],

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = [];
        if (this._parseTree[0] instanceof uglifyJs.AST_String) {
            // GETSTATICURL('foo/bar', ...);
            var url = this._parseTree[0].value;

            this.originalWildCardRelation = new AssetGraph.StaticUrlMapEntry({
                from: this,
                href: url,
                to: {
                    url: url
                }
            });
            this.wildCardValueAsts = this._parseTree.slice(1);

            outgoingRelations.push(this.originalWildCardRelation);
        } else if (this._parseTree[0] instanceof uglifyJs.AST_PropAccess) {
            // GETSTATICURL({foo: 'bar'}[...]);

            this.relationByWildCardValues = {};
            this.wildCardValueAsts = [];
            var cursor = this._parseTree[0];

            while (cursor instanceof uglifyJs.AST_PropAccess) {
                this.wildCardValueAsts.push(typeof cursor.property === 'string' ? new uglifyJs.AST_String(cursor.property) : cursor.property);
                cursor = cursor.expression;
            }
            this.wildCardValueAsts.reverse();
            var keys = [],
                populateUrlByWildCardValues = function (node, relationByWildCardValuesCursor, nestingLevel) {
                    if (nestingLevel > this.wildCardValueAsts.length || !node || !(node instanceof uglifyJs.AST_Object)) {
                        throw new errors.SyntaxError({message: 'StaticUrlMap: Unsupported syntax: ' + this._parseTree[0].print_to_string(), asset: this});
                    }
                    for (var i = 0 ; i < node.properties.length ; i += 1) {
                        var key = node.properties[i].key;
                        if (node.properties[i].value instanceof uglifyJs.AST_String) {
                            if (nestingLevel !== this.wildCardValueAsts.length) {
                                throw new errors.SyntaxError({message: 'StaticUrlMap: Unsupported syntax: ' + this._parseTree[0].print_to_string(), asset: this});
                            }
                            relationByWildCardValuesCursor[key] = new AssetGraph.StaticUrlMapEntry({
                                from: this,
                                href: node.properties[i].value.value,
                                wildCardValues: [].concat(keys),
                                to: {
                                    url: node.properties[i].value.value
                                }
                            });
                            outgoingRelations.push(relationByWildCardValuesCursor[key]);
                        } else {
                            // node.properties[i].value instanceof uglifyJs.AST_Object
                            relationByWildCardValuesCursor[key] = relationByWildCardValuesCursor[key] || {};
                            keys.push(key);
                            populateUrlByWildCardValues(node.properties[i].value, relationByWildCardValuesCursor[key], nestingLevel + 1);
                            keys.pop(key);
                        }
                    }
                }.bind(this);

            populateUrlByWildCardValues(cursor, this.relationByWildCardValues, 1);
        } else {
            throw new errors.SyntaxError({message: 'StaticUrlMap: Unsupported syntax: ' + this._parseTree[0].print_to_string(), asset: this});
        }
        return outgoingRelations;
    },

    toAst: function () {
        // If the nesting level is 0 and there are wildcards, it means that they expanded to a single file,
        // so no additional StaticUrlMapEntry relations have been attached.
        // This is all terribly confusing. Everything relating to GETSTATICURL should be rewritten.
        var nestingLevel = 0;

        var expressionAst = (function convert(obj) {
            if (obj.isRelation) {
                // When a multiplied relation is attached, it won't have a 'href' until the populate transform
                // calls relation.refreshHref() on the next line. This annoyance might get fixed if the base
                // asset resolution could be moved to Asset, but I'm unsure about that:
                return new uglifyJs.AST_String({value: obj.href || 'n/a'});
            } else {
                nestingLevel += 1;
                return new uglifyJs.AST_Object({
                    properties: _.map(obj, function (value, key) {
                        return new uglifyJs.AST_ObjectKeyVal({key: key, value: convert(value)});
                    })
                });
            }
        }(this.relationByWildCardValues || this.originalWildCardRelation));
        if (nestingLevel > 0) {
            this.wildCardValueAsts.forEach(function (wildCardValueAst) {
                expressionAst = new uglifyJs.AST_Sub({expression: expressionAst, property: wildCardValueAst});
            });
        }
        return expressionAst;
    }
});

module.exports = StaticUrlMap;
