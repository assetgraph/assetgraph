var util = require('util'),
    _ = require('lodash'),
    AssetGraph = require('../'),
    escodegen = require('escodegen'),
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
        var outgoingRelations = Asset.prototype.findOutgoingRelationsInParseTree.call(this);
        if (this._parseTree[0].type === 'Literal' && typeof this._parseTree[0].value === 'string') {
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
        } else if (this._parseTree[0].type === 'MemberExpression') {
            // GETSTATICURL({foo: 'bar'}[...]);

            this.relationByWildCardValues = {};
            this.wildCardValueAsts = [];
            var cursor = this._parseTree[0];

            while (cursor.type === 'MemberExpression') {
                this.wildCardValueAsts.push(cursor.computed ? cursor.property : { type: 'Literal', value: cursor.property.value } );
                cursor = cursor.object;
            }
            this.wildCardValueAsts.reverse();
            var keys = [],
                populateUrlByWildCardValues = function (node, relationByWildCardValuesCursor, nestingLevel) {
                    if (nestingLevel > this.wildCardValueAsts.length || !node || node.type !== 'ObjectExpression') {
                        throw new errors.SyntaxError({message: 'StaticUrlMap: Unsupported syntax: ' + escodegen.generate(this._parseTree[0]), asset: this});
                    }
                    for (var i = 0 ; i < node.properties.length ; i += 1) {
                        var key = node.properties[i].key.value;
                        if (node.properties[i].value.type === 'Literal' && typeof node.properties[i].value.value === 'string') {
                            if (nestingLevel !== this.wildCardValueAsts.length) {
                                throw new errors.SyntaxError({message: 'StaticUrlMap: Unsupported syntax: ' + escodegen.generate(this._parseTree[0]), asset: this});
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
                return { type: 'Literal', value: obj.href || 'n/a' };
            } else {
                nestingLevel += 1;
                return {
                    type: 'ObjectExpression',
                    properties: _.map(obj, function (value, key) {
                        return { type: 'Property', kind: 'init', key: { type: 'Literal', value: key }, value: convert(value) };
                    })
                };
            }
        }(this.relationByWildCardValues || this.originalWildCardRelation));
        if (nestingLevel > 0) {
            this.wildCardValueAsts.forEach(function (wildCardValueAst) {
                expressionAst = { type: 'MemberExpression', computed: true, object: expressionAst, property: wildCardValueAst };
            });
        }
        return expressionAst;
    }
});

module.exports = StaticUrlMap;
