/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('underscore'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib');

describe('transforms/addCacheManifest', function () {
    it('should handle a single page with an existing cache manifest', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/addCacheManifest/existingCacheManifest/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 4);
                expect(assetGraph, 'to contain assets', 4);
                expect(assetGraph, 'to contain assets', 'CacheManifest', 1);

                var outgoingRelations = assetGraph.findRelations({from: assetGraph.findAssets({type: 'CacheManifest'})[0]});
                expect(outgoingRelations, 'to have length', 1);
                expect(outgoingRelations[0].to.type, 'to equal', 'Png');
                expect(outgoingRelations[0].sectionName, 'to equal', 'FALLBACK');
            })
            .addCacheManifest({isInitial: true})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'CacheManifest');
                var manifest = assetGraph.findAssets({type: 'CacheManifest'})[0],
                    barPng = assetGraph.findAssets({
                        url: urlTools.resolveUrl(assetGraph.root, 'bar.png')
                    });
                expect(assetGraph, 'to contain relation', {from: manifest, to: barPng});

                var cacheManifestText = assetGraph.findAssets({type: 'CacheManifest'})[0].text;

                var fooPngMatches = cacheManifestText.match(/\bfoo.png/gm);
                expect(fooPngMatches, 'to be an array');
                expect(fooPngMatches, 'to have length', 1);

                expect(cacheManifestText, 'to contain', 'NETWORK:\n# I am a comment\n/helloworld.php\n');
                expect(cacheManifestText, 'to contain', 'FALLBACK:\nheresthething.asp foo.png\n');

                assetGraph.findAssets({url: /foo.png$/})[0].url = urlTools.resolveUrl(assetGraph.root, 'somewhere/else/quux.png');

                var cacheManifestText = assetGraph.findAssets({type: 'CacheManifest'})[0].text;
                expect(cacheManifestText, 'not to match', /\bfoo.png/);
                expect(cacheManifestText, 'to contain', 'FALLBACK:\nheresthething.asp somewhere/else/quux.png\n');
            })
            .run(done);
    });

    it('should add a cache manifest to a page that does not already have one', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/addCacheManifest/noCacheManifest/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: /^file:/}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 7);
                expect(assetGraph, 'to contain relations', 7);
                expect(assetGraph, 'to contain asset', 'Png');
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true});
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain asset', {type: 'JavaScript', isLoaded: false});
            })
            .addCacheManifest({isInitial: true})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'CacheManifest');
                expect(_.pluck(assetGraph.findRelations({from: {type: 'CacheManifest'}}), 'href'), 'to equal', [
                    'foo.png',
                    'style.css',
                    'modernBrowsers.js'
                ]);
            })
            .run(done);
    });

    it('should add cache manifest to multiple pages', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/addCacheManifest/noCacheManifestMultiPage/'})
            .loadAssets('*.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain relations', 4);
                expect(assetGraph, 'to contain asset', 'Png');
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relations', 'HtmlIFrame');
                expect(assetGraph, 'to contain relations', 'HtmlImage', 2);
            })
            .addCacheManifest({isInitial: true})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'CacheManifest', 2);

                var cacheManifest = assetGraph.findAssets({type: 'CacheManifest', incoming: {from: {url: /\/index\.html$/}}});
                expect(assetGraph, 'to contain relations', {from: cacheManifest}, 2);
                expect(assetGraph, 'to contain relation', {from: cacheManifest, to: {url: /\/foo\.png$/}});
                expect(assetGraph, 'to contain relation', {from: cacheManifest, to: {url: /\/otherpage\.html$/}});

                var cacheManifest = assetGraph.findAssets({type: 'CacheManifest', incoming: {from: {url: /\/otherpage\.html$/}}});
                expect(assetGraph, 'to contain relation', {from: cacheManifest});
                expect(assetGraph.findRelations({from: cacheManifest})[0].to, 'to equal', assetGraph.findAssets({url: /\/foo\.png$/})[0]);
            })
            .run(done);
    });

    it('should add a cache manifest and update the existing one in a multi-page test case with one existing manifest', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/addCacheManifest/existingCacheManifestMultiPage/'})
            .loadAssets('*.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain assets', 'Png', 2);
                expect(assetGraph, 'to contain asset', 'CacheManifest');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .addCacheManifest({isInitial: true})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'CacheManifest', 2);

                var cacheManifest = assetGraph.findAssets({type: 'CacheManifest', incoming: {from: {url: /\/pageone\.html$/}}})[0];
                expect(assetGraph, 'to contain relations', {from: cacheManifest}, 3);
                expect(assetGraph, 'to contain relation', {from: cacheManifest, to: {url: /\/style\.css/}});
                expect(assetGraph, 'to contain relation', {from: cacheManifest, to: {url: /\/quux\.png/}});
                expect(assetGraph, 'to contain relation', {from: cacheManifest, to: {url: /\/foo\.png/}});

                var cacheManifest = assetGraph.findAssets({type: 'CacheManifest', incoming: {from: {url: /\/pagetwo\.html$/}}})[0];
                expect(assetGraph, 'to contain relations', {from: cacheManifest}, 2);
                expect(assetGraph, 'to contain relation', {from: cacheManifest, to: {url: /\/style\.css/}});
                expect(assetGraph, 'to contain relation', {from: cacheManifest, to: {url: /\/quux\.png/}});
            })
            .run(done);
    });
});
