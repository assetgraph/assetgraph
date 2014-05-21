/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    urlTools = require('urltools'),
    Path = require('path'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptGetStaticUrl', function () {
    it('should handle a test case with a wildcard GETSTATICURL', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptGetStaticUrl/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph, 'to contain relations', 'JavaScriptGetStaticUrl', 3);
                expect(assetGraph, 'to contain assets', 'StaticUrlMap', 3);
                expect(assetGraph, 'to contain relations', 'StaticUrlMapEntry', 9);
                expect(assetGraph, 'to contain assets', 'Json', 4);
                expect(assetGraph, 'to contain relations', {href: 'json/a.json'}, 2);
                expect(assetGraph, 'to contain relations', {href: 'json/b.json'}, 3);
                expect(assetGraph, 'to contain relations', {href: 'json/c.json'}, 3);
                expect(assetGraph, 'to contain relation', {href: 'json/subsubdir/d.json'});

                assetGraph.findAssets({url: /\/a.json/})[0].url = urlTools.resolveUrl(assetGraph.root, 'static/a76a76a7a.json');

                var src = assetGraph.findAssets({type: 'JavaScript'})[0].text;
                /*jshint evil:true*/
                expect(new Function(src + ';return theThing;')(), 'to equal', 'static/a76a76a7a.json');
                expect(new Function(src + ';return theDoubleStarThing;')(), 'to equal', 'json/subsubdir/d.json');
                expect(new Function(src + ';return theBracketThing;')(), 'to equal', 'json/c.json');

                assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).forEach(function (javaScriptGetStaticUrl) {
                    javaScriptGetStaticUrl.omitFunctionCall = true;
                    javaScriptGetStaticUrl.inline();
                });

                expect(new Function(src + ';return theThing;')(), 'to equal', 'static/a76a76a7a.json');
                expect(new Function(src + ';return theDoubleStarThing;')(), 'to equal', 'json/subsubdir/d.json');
                expect(new Function(src + ';return theBracketThing;')(), 'to equal', 'json/c.json');
                /*jshint evil:false*/
            })
            .run(done);
    });

    it('should handle the same wildcard GETSTATICURL test case again', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptGetStaticUrl/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph, cb) {
                new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptGetStaticUrl/'})
                    .loadAssets({
                        url: 'file://' + Path.resolve(__dirname, '..', '..', 'testdata', 'relations', 'JavaScriptGetStaticUrl', 'index2.html'),
                        type: 'Html',
                        text: '<html><body><script>' + assetGraph.findAssets({type: 'JavaScript'})[0].text + '</script></body></html>'
                    })
                    .populate()
                    .queue(function (assetGraph) {
                        expect(assetGraph, 'to contain asset', 'JavaScript');
                        expect(assetGraph, 'to contain relations', 'JavaScriptGetStaticUrl', 3);
                        expect(assetGraph, 'to contain assets', 'StaticUrlMap', 3);
                        expect(assetGraph, 'to contain relations', 'StaticUrlMapEntry', 9);
                        expect(assetGraph, 'to contain assets', 'Json', 4);
                        expect(assetGraph, 'to contain relations', {href: 'json/a.json'}, 2);
                        expect(assetGraph, 'to contain relations', {href: 'json/b.json'}, 3);
                        expect(assetGraph, 'to contain relations', {href: 'json/c.json'}, 3);
                        expect(assetGraph, 'to contain relation', {href: 'json/subsubdir/d.json'});

                        assetGraph.findAssets({url: /\/a.json/})[0].url = urlTools.resolveUrl(assetGraph.root, 'static/a76a76a7a.json');

                        var src = assetGraph.findAssets({type: 'JavaScript'})[0].text;
                        /*jshint evil:true*/
                        expect(new Function(src + ';return theThing;')(), 'to equal', 'static/a76a76a7a.json');
                        expect(new Function(src + ';return theDoubleStarThing;')(), 'to equal', 'json/subsubdir/d.json');
                        expect(new Function(src + ';return theBracketThing;')(), 'to equal', 'json/c.json');

                        assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).forEach(function (javaScriptGetStaticUrl) {
                            javaScriptGetStaticUrl.omitFunctionCall = true;
                            javaScriptGetStaticUrl.inline();
                        });

                        expect(new Function(src + ';return theThing;')(), 'to equal', 'static/a76a76a7a.json');
                        expect(new Function(src + ';return theDoubleStarThing;')(), 'to equal', 'json/subsubdir/d.json');
                        expect(new Function(src + ';return theBracketThing;')(), 'to equal', 'json/c.json');
                        /*jshint evil:false*/
                    })
                    .run(cb);
            })
            .run(done);
    });
});
