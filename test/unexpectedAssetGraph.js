var URL = require('url'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib/'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs;

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

        expect.addType({
            name: 'UglifyJS',
            base: 'object',
            identify: function (obj) {
                return obj instanceof uglifyJs.AST_Node;
            },
            equal: function (a, b) {
                return a.equivalent_to(b);
            },
            inspect: function (astNode, depth, output) {
                return output.text('AST(').code(astNode.print_to_string(), 'javascript').text(')');
            }
        });

        expect.addAssertion('AssetGraph', 'to contain [no] (asset|assets)', function (expect, subject, value, number) {
            this.errorMode = 'nested';
            if (typeof value === 'string') {
                value = {type: value};
            } else if (typeof value === 'number') {
                number = value;
                value = {};
            }
            if (this.flags.no) {
                number = 0;
            } else if (typeof number === 'undefined') {
                number = 1;
            }
            expect(subject.findAssets(value).length, 'to equal', number);
        });

        expect.addAssertion('AssetGraph', 'to contain (url|urls)', function (expect, subject, urls) {
            if (!Array.isArray(urls)) {
                urls = [urls];
            }
            urls = urls.map(function (url) {
                return URL.resolve(subject.root, url);
            }, this);
            this.errorMode = 'nested';
            urls.forEach(function (url) {
                expect(subject.findAssets({url: url}).length, 'to equal', 1);
            });
        });

        expect.addAssertion('AssetGraph', 'to contain [no] (relation|relations) [including unresolved]', function (expect, subject, queryObj, number) {
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
            expect(subject.findRelations(queryObj, this.flags['including unresolved']).length, 'to equal', number);
        });

        function toAst(stringOrAssetOrFunctionOrAst) {
            if (typeof stringOrAssetOrFunctionOrAst === 'string') {
                return uglifyJs.parse(stringOrAssetOrFunctionOrAst);
            } else if (stringOrAssetOrFunctionOrAst.isAsset) {
                return stringOrAssetOrFunctionOrAst.parseTree;
            } else if (typeof stringOrAssetOrFunctionOrAst === 'function') {
                return uglifyJs.parse(stringOrAssetOrFunctionOrAst.toString().replace(/^function[^\(]*?\(\)\s*\{|\}$/g, ''));
            } else {
                return stringOrAssetOrFunctionOrAst;
            }
        }

        function prettyPrintAst(ast) {
            var outputStream = uglifyJs.OutputStream({
                comments: false,
                beautify: true
            });
            ast.print(outputStream);
            return outputStream.get();
        }

        expect.addAssertion('[not] to have the same AST as', function (expect, subject, value) {
            expect(prettyPrintAst(toAst(subject)), '[not] to equal', prettyPrintAst(toAst(value)));
        });
    }
};
