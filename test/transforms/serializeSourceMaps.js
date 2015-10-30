/*global describe, it*/
var expect = require('../unexpected-with-plugins');
var esprima = require('esprima');
var AssetGraph = require('../../lib/');
var _ = require('lodash');

describe('transforms/serializeSourceMaps', function () {
    describe('with a JavaScript asset with an existing source map', function () {
        it('should leave the source map alone when no manipulations have happened', function () {
            var initialSourceMapParseTree;
            var initialSourceMapParseTreeCopy;
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/serializeSourceMaps/existingJavaScriptSourceMap/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                    expect(assetGraph, 'to contain asset', 'SourceMap');
                    initialSourceMapParseTree = assetGraph.findAssets({type: 'SourceMap'})[0]._parseTree;
                    initialSourceMapParseTreeCopy = _.clone(initialSourceMapParseTree, true);
                })
                .serializeSourceMaps()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'SourceMap');
                    var sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
                    expect(sourceMap.parseTree, 'to be', initialSourceMapParseTree);
                    expect(sourceMap.parseTree, 'to satisfy', initialSourceMapParseTreeCopy);
                });
        });

        it('should update the source map when manipulations have happened', function () {
            var initialSourceMapParseTree;
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/serializeSourceMaps/existingJavaScriptSourceMap/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                    expect(assetGraph, 'to contain asset', 'SourceMap');
                    initialSourceMapParseTree = assetGraph.findAssets({type: 'SourceMap'})[0]._parseTree;
                    var javaScript = assetGraph.findAssets({ fileName: 'jquery-1.10.1.min.js' })[0];
                    javaScript.parseTree.body.push(esprima.parse('var bogus = 123;', {
                        loc: true,
                        attachComment: true,
                        source: assetGraph.root + 'bogus.js'
                    }).body[0]);
                    javaScript.markDirty();
                })
                .serializeSourceMaps()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'SourceMap');
                    var sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
                    expect(sourceMap.parseTree, 'not to be', initialSourceMapParseTree);
                    expect(JSON.parse(sourceMap.text), 'to satisfy', {
                        sources: expect.it('to contain', assetGraph.root + 'bogus.js')
                    });
                });
        });
    });

    describe('with a JavaScript asset that has no existing source map', function () {
        it('should not add a source map when no manipulations have happened', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/serializeSourceMaps/noExistingJavaScriptSourceMap/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph, 'to contain no assets', 'SourceMap');
                })
                .serializeSourceMaps()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain no assets', 'SourceMap');
                });
        });

        it('should add a source map when manipulations have happened', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/serializeSourceMaps/noExistingJavaScriptSourceMap/'})
                .loadAssets('index.html', 'bogus.js')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                    expect(assetGraph, 'to contain no assets', 'SourceMap');
                    var javaScript = assetGraph.findAssets({ fileName: 'myScript.js' })[0];
                    var bogusJs = assetGraph.findAssets({ fileName: 'bogus.js' })[0];
                    javaScript.parseTree.body.splice(2, 0, bogusJs.parseTree.body[0]);
                    assetGraph.removeAsset(bogusJs);
                    javaScript.markDirty();
                })
                .serializeSourceMaps()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'SourceMap');
                    var sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
                    expect(assetGraph.findAssets({fileName: 'myScript.js'})[0].text, 'to contain', '//# sourceMappingURL=myScript.js.map');
                    expect(JSON.parse(sourceMap.text), 'to satisfy', {
                        sources: [ assetGraph.root + 'myScript.js', assetGraph.root + 'bogus.js' ]
                    });
                });
        });

        it('should retain the source mapping info when cloning an asset', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/serializeSourceMaps/noExistingJavaScriptSourceMap/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    var myScript = assetGraph.findAssets({ fileName: 'myScript.js' })[0];
                    myScript.parseTree.body.push(esprima.parse('var bogus = 123;', {
                        loc: true,
                        attachComment: true,
                        source: assetGraph.root + 'bogus.js'
                    }).body[0]);
                    myScript.markDirty();
                    var clonedMyScript = myScript.clone();
                    assetGraph.removeAsset(myScript);
                    clonedMyScript.url = assetGraph.root + 'clonedMyScript.js';
                })
                .serializeSourceMaps()
                .queue(function (assetGraph) {
                    var sourceMap = assetGraph.findRelations({ from: { fileName: 'clonedMyScript.js' }, to: { type: 'SourceMap' } })[0].to;
                    expect(JSON.parse(sourceMap.text), 'to satisfy', {
                        sources: expect.it('to contain', assetGraph.root + 'bogus.js')
                    });
                });
        });
    });
});
