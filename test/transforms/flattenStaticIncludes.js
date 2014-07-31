/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib');

describe('transforms/flattenStaticIncludes', function () {
    it('should handle a combo test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/flattenStaticIncludes/combo/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 10);
                expect(assetGraph, 'to contain assets', {type: 'JavaScript', isInline: true}, 2);
            })
            .flattenStaticIncludes({type: 'Html'})
            .queue(function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'), 'to equal', [
                    'a.js',
                    'b.js',
                    'c.js',
                    'd.js',
                    undefined,
                    'e.js',
                    'f.js',
                    'g.js',
                    'h.js',
                    undefined
                ]);
            })
            .run(done);
    });

    it('should handle a test case where one of the INCLUDEd files is already included via a <script>', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/flattenStaticIncludes/duplicate/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
                expect(assetGraph, 'to contain asset', {type: 'JavaScript', isInline: true});
                expect(assetGraph, 'to contain assets', 'Css', 4);
            })
            .flattenStaticIncludes({type: 'Html'})
            .queue(function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'HtmlScript', from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'), 'to equal', [
                    'a.js',
                    'b.js',
                    'c.js',
                    undefined,
                    'd.js'
                ]);

                expect(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'), 'to equal', [

                    'a.css',
                    'c.css',
                    'd.css',
                    'b.css'
                ]);
            })
            .run(done);
    });

    it('should handle a test case with .template and .html assets being INCLUDEd', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/flattenStaticIncludes/inlineScriptTemplates/'})
            .loadAssets('index.html')
            .populate()
            .flattenStaticIncludes({type: 'Html'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlInlineScriptTemplate', 3);
            })
            .run(done);
    });

    it('should handle a test case with .less and .css assets being INCLUDEd', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/flattenStaticIncludes/lessAndCss/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 2);
                expect(assetGraph, 'to contain asset', 'Less');
            })
            .flattenStaticIncludes({type: 'Html'})
            .queue(function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'), 'to equal', [
                    'a.css',
                    'b.less',
                    'c.css'
                ]);
            })
            .run(done);
    });
});
