/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptInclude', function () {
    it('should handle a combo test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptInclude/topLevelStatements/'})
            .loadAssets('index.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'JavaScriptInclude', 2);

                assetGraph.findRelations({type: 'JavaScriptInclude'})[0].detach();
                expect(/INCLUDE\([\'\"]one\.js\1\)/.test(assetGraph.findAssets({url: /\/index\.js$/})[0].text), 'to be false');

                var newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'quux.js'),
                    text: 'alert(\'quux.js\');'
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'first');

                expect(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'), 'to equal',
                                 ['quux.js', 'bar.js']);

                newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'baz.js'),
                    text: 'alert(\'baz.js\');'
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'after', assetGraph.findRelations({to: {url: /\/quux\.js$/}})[0]);

                expect(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'), 'to equal',
                                 ['quux.js', 'baz.js', 'bar.js']);

                newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'bazze.js'),
                    text: 'alert(\'bazze.js\');'
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'before', assetGraph.findRelations({to: {url: /\/bar\.js$/}})[0]);

                expect(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'), 'to equal',
                                 ['quux.js', 'baz.js', 'bazze.js', 'bar.js']);

                newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'prinzenrolle.js'),
                    text: 'alert(\'prinzenrolle.js\');'
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'last');

                expect(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'), 'to equal',
                                 ['quux.js', 'baz.js', 'bazze.js', 'bar.js', 'prinzenrolle.js']);
            })
            .run(done);
    });

    it('should handle the same test case with original INCLUDE statements in one sequenced statement', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptInclude/sequencedStatements/'})
            .loadAssets('index.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'JavaScriptInclude', 2);
                assetGraph.findRelations({type: 'JavaScriptInclude'})[0].detach();
                expect(/INCLUDE\([\'\"]one\.js\1\)/.test(assetGraph.findAssets({url: /\/index\.js$/})[0].text), 'to be false');

                var newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'quux.js'),
                    text: 'alert(\'quux.js\');'
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'first');

                expect(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'), 'to equal',
                                 ['quux.js', 'bar.js']);

                newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'baz.js'),
                    text: 'alert(\'baz.js\');'
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'after', assetGraph.findRelations({to: {url: /\/quux\.js$/}})[0]);

                expect(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'), 'to equal',
                                 ['quux.js', 'baz.js', 'bar.js']);

                newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'bazze.js'),
                    text: 'alert(\'bazze.js\');'
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'before', assetGraph.findRelations({to: {url: /\/bar\.js$/}})[0]);

                expect(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'), 'to equal',
                                 ['quux.js', 'baz.js', 'bazze.js', 'bar.js']);

                newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'prinzenrolle.js'),
                    text: 'alert(\'prinzenrolle.js\');'
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'last');

                expect(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'), 'to equal',
                                 ['quux.js', 'baz.js', 'bazze.js', 'bar.js', 'prinzenrolle.js']);
            })
            .run(done);
    });
});
