var URL = require('url');
var urlTools = require('urltools');
var esprima = require('esprima');
var escodegen = require('escodegen');

module.exports = {
    name: 'unexpected-assetgraph',
    installInto: function (expect) {
        expect.addType({
            name: 'AssetGraph.asset',
            base: 'object',
            identify: function (obj) {
                return obj && obj.isAsset;
            },
            equal: function (a, b) {
                return (
                    a.type === b.type &&
                    a.urlOrDescription === b.urlOrDescription &&
                    (a.isText ? a.text : a.rawSrc) === (b.isText ? b.text : b.rawSrc)
                    // && same outgoing relations
                );
            },
            inspect: function (asset, depth, output) {
                return output.text('Asset(').text(asset.urlOrDescription).text(')');
            }
        });

        expect.addType({
            name: 'AssetGraph',
            base: 'object',
            identify: function (obj) {
                return obj && obj.isAssetGraph;
            },
            inspect: function (assetGraph, depth, output) {
                output
                    .text('AssetGraph(').nl();

                assetGraph.findAssets({isInline: false}).forEach(function (asset) {
                    output.text((asset.isLoaded ? ' ' : '!') + ' ' + urlTools.buildRelativeUrl(assetGraph.root, asset.url)).nl();
                });

                return output.text(')');
            }
        });

        expect.addType({
            name: 'AssetGraph.relation',
            base: 'object',
            identify: function (obj) {
                return obj && obj.isRelation;
            },
            equal: function (a, b) {
                return a === b;
            },
            inspect: function (relation, depth, output) {
                return output.text('Relation(').text(relation.toString()).text(')');
            }
        });

        expect.addAssertion([
            '<AssetGraph> to contain [no] (asset|assets) <string|object|number?>',
            '<AssetGraph> to contain [no] (asset|assets) <string|object|number> <number?>'
        ], function (expect, subject, value, number) {
            this.errorMode = 'nested';
            if (typeof value === 'string') {
                value = {type: value};
            } else if (typeof value === 'number') {
                number = value;
                value = {};
            }
            if (this.flags.no) {
                return expect(subject.findAssets(value), 'to satisfy', []);
            } else if (typeof number === 'undefined') {
                number = 1;
            }
            expect(subject.findAssets(value), 'to have length', number);
        });

        expect.addAssertion('<AssetGraph> to contain (url|urls) <string|array?>', function (expect, subject, urls) {
            if (!Array.isArray(urls)) {
                urls = [urls];
            }
            urls = urls.map(function (url) {
                return URL.resolve(subject.root, url);
            }, this);
            this.errorMode = 'nested';
            urls.forEach(function (url) {
                expect(subject.findAssets({url: url}), 'to have length', 1);
            });
        });

        expect.addAssertion('<AssetGraph> to contain [no] (relation|relations) [including unresolved] <string|object|number?>', function (expect, subject, queryObj) {
            var number;
            if (typeof queryObj === 'string') {
                queryObj = {type: queryObj};
            } else if (typeof queryObj === 'number') {
                number = queryObj;
                queryObj = {};
            }
            if (this.flags.no) {
                number = 0;
            } else if (typeof number === 'undefined') {
                number = 1;
            }
            this.errorMode = 'nested';
            expect(subject.findRelations(queryObj, this.flags['including unresolved']), 'to have length', number);
        });

        expect.addAssertion('<AssetGraph> to contain [no] (relation|relations) [including unresolved] <string|object|number> <number?>', function (expect, subject, queryObj, number) {
            if (typeof queryObj === 'string') {
                queryObj = {type: queryObj};
            } else if (typeof queryObj === 'number') {
                number = queryObj;
                queryObj = {};
            }
            if (this.flags.no) {
                number = 0;
            } else if (typeof number === 'undefined') {
                number = 1;
            }
            this.errorMode = 'nested';
            expect(subject.findRelations(queryObj, this.flags['including unresolved']), 'to have length', number);
        });

        function toAst(stringOrAssetOrFunctionOrAst) {
            if (typeof stringOrAssetOrFunctionOrAst === 'string') {
                return esprima.parse(stringOrAssetOrFunctionOrAst);
            } else if (stringOrAssetOrFunctionOrAst.isAsset) {
                return stringOrAssetOrFunctionOrAst.parseTree;
            } else if (typeof stringOrAssetOrFunctionOrAst === 'function') {
                return { type: 'Program', body: esprima.parse('!' + stringOrAssetOrFunctionOrAst.toString()).body[0].expression.argument.body.body };
            } else {
                return stringOrAssetOrFunctionOrAst;
            }
        }

        function prettyPrintAst(ast) {
            return escodegen.generate(ast);
        }

        expect.addAssertion('[not] to have the same AST as', function (expect, subject, value) {
            expect(prettyPrintAst(toAst(subject)), '[not] to equal', prettyPrintAst(toAst(value)));
        });
    }
};
