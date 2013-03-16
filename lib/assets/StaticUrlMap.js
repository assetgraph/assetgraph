var util = require('util'),
    _ = require('underscore'),
    uglifyJs = require('uglify-js-papandreou'),
    uglifyAst = require('uglifyast'),
    errors = require('../errors'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset'),
    AssetGraph = require('../AssetGraph'),
    urlTools = require('../util/urlTools');

function StaticUrlMap(config) {
    Asset.call(this, config);
    if (!this._parseTree) {
        throw new Error("StaticUrlMap: parseTree config option is mandatory");
    }
}

util.inherits(StaticUrlMap, Asset);

extendWithGettersAndSetters(StaticUrlMap.prototype, {
    type: 'StaticUrlMap',

    contentType: null, // Avoid reregistering application/octet-stream

    supportedExtensions: [],

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = [];
        if (this._parseTree[0][0] === 'string') {
            // GETSTATICURL('foo/bar', ...);
            var url = this._parseTree[0][1];

            this.originalWildCardRelation = new AssetGraph.StaticUrlMapEntry({
                from: this,
                href: url,
                to: {
                    url: url
                }
            });
            this.wildCardValueAsts = this._parseTree.slice(1);

            outgoingRelations.push(this.originalWildCardRelation);
        } else if (this._parseTree[0][0] === 'sub' || this._parseTree[0][0] === 'dot') {
            // GETSTATICURL({foo: "bar"}[...]);

            this.relationByWildCardValues = {};
            this.wildCardValueAsts = [];
            var cursor = this._parseTree[0];

            while (cursor[0] === 'sub' || cursor[0] === 'dot') {
                this.wildCardValueAsts.push(cursor[0] === 'sub' ? cursor[2] : ['string', cursor[2]]);
                cursor = cursor[1];
            }
            this.wildCardValueAsts.reverse();
            var keys = [],
                populateUrlByWildCardValues = function (node, relationByWildCardValuesCursor, nestingLevel) {
                    if (nestingLevel > this.wildCardValueAsts.length || !node || node[0] !== 'object') {
                        throw new errors.SyntaxError({message: "StaticUrlMap: Unsupported syntax: " + uglifyJs.uglify.gen_code(this._parseTree[0]), asset: this});
                    }
                    for (var i = 0 ; i < node[1].length ; i += 1) {
                        var key = node[1][i][0];
                        if (node[1][i][1][0] === 'string') {
                            if (nestingLevel !== this.wildCardValueAsts.length) {
                                throw new errors.SyntaxError({message: "StaticUrlMap: Unsupported syntax: " + uglifyJs.uglify.gen_code(this._parseTree[0]), asset: this});
                            }
                            relationByWildCardValuesCursor[key] = new AssetGraph.StaticUrlMapEntry({
                                from: this,
                                href: node[1][i][1][1],
                                wildCardValues: [].concat(keys),
                                to: {
                                    url: node[1][i][1][1]
                                }
                            });
                            outgoingRelations.push(relationByWildCardValuesCursor[key]);
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
            throw new errors.SyntaxError({message: "StaticUrlMap: Unsupported syntax: " + uglifyJs.uglify.gen_code(this._parseTree[0]), asset: this});
        }
        return outgoingRelations;
    },

    toAst: function () {
        var expressionAst = (function convert(obj) {
            if (obj.isRelation) {
                // When a multiplied relation is attached, it won't have a 'href' until the populate transform
                // calls relation.refreshHref() on the next line. This annoyance might get fixed if the base
                // asset resolution could be moved to Asset, but I'm unsure about that:
                return ['string', obj.href || 'n/a'];
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
