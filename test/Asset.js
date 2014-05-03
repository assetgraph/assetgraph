var expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

describe('Asset', function () {
    it('should handle an asset with an extensionless url', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index'
        });

        expect(htmlAsset.extension, 'to equal', '');
        expect(htmlAsset.fileName, 'to equal', 'index');

        htmlAsset.extension = '.foo';

        expect(htmlAsset.extension, 'to equal', '.foo');
        expect(htmlAsset.fileName, 'to equal', 'index.foo');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index.foo');

        htmlAsset.url = 'http://anotherexample.com/heythere.dhtml';

        expect(htmlAsset, 'to have properties', {
            extension: '.dhtml',
            fileName: 'heythere.dhtml'
        });

        htmlAsset.url = null;

        // The extension and fileName properties should still have the previous value
        expect(htmlAsset, 'to have properties', {
            extension: '.dhtml',
            fileName: 'heythere.dhtml'
        });
    });

    it('should handle another Html asset with an extensionless url', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'æøå',
            url: 'http://example.com/index'
        });

        expect(htmlAsset.extension, 'to equal', '');
        expect(htmlAsset.fileName, 'to equal', 'index');
        expect(htmlAsset.lastKnownByteLength, 'to equal', 6);

        htmlAsset.fileName = 'thething.foo';

        expect(htmlAsset.extension, 'to equal', '.foo');
        expect(htmlAsset.fileName, 'to equal', 'thething.foo');
        expect(htmlAsset.url, 'to equal', 'http://example.com/thething.foo');

        htmlAsset.unload();
        expect(htmlAsset.lastKnownByteLength, 'to equal', 6);
    });

    it('should handle an Html asset with an url that has an extension', function () {
        var htmlAsset = new AssetGraph.Html({
            rawSrc: new Buffer([0xc3, 0xa6, 0xc3, 0xb8, 0xc3, 0xa5]),
            url: 'http://example.com/index.blah'
        });

        expect(htmlAsset.lastKnownByteLength, 'to equal', 6);
        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');

        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', 'index.blerg');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg');

        htmlAsset.rawSrc = new Buffer('foo', 'utf-8');

        expect(htmlAsset.lastKnownByteLength, 'to equal', 3);
    });

    it('should handle another Html asset with an url that has an extension', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index.blah'
        });

        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');
        htmlAsset.fileName = 'index.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', 'index.blerg');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg');
    });

    it('should handle yet another Html asset with an url that has an extension', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index.blah'
        });
        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');
        htmlAsset.extension = '';
        expect(htmlAsset.extension, 'to equal', '');
        expect(htmlAsset.fileName, 'to equal', 'index');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index');
    });

    it('should yet yet another Html asset with an url that has an extension', function () {
        var htmlAsset =new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index.blah'
        });

        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');
        htmlAsset.fileName = '';
        expect(htmlAsset.extension, 'to equal', '');
        expect(htmlAsset.fileName, 'to equal', '');
        expect(htmlAsset.url, 'to equal', 'http://example.com/');
    });

    it('should handle an Html asset with an url that has an extension and a fragment identifier', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index.blah#yay'
        });
        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');
        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', 'index.blerg');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg#yay');
        htmlAsset.extension = "";
        expect(htmlAsset.extension, 'to equal', '');
        expect(htmlAsset.fileName, 'to equal', 'index');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index#yay');
    });

    it('should handle another Html asset with an url that has an extension and a fragment identifier', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index.blah#yay'
        });
        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');
        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', 'index.blerg');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg#yay');
    });

    it('should handle an Html asset with an url that has an extension and a query string', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index.blah?yay=bar'
        });

        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');
        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', 'index.blerg');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg?yay=bar');
        htmlAsset.extension = "";
        expect(htmlAsset.fileName, 'to equal', 'index');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index?yay=bar');
    });

    it('should handle another Html asset with an url that has an extension and a query string', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index.blah?yay=bar'
        });

        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');
        htmlAsset.fileName = 'index.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', 'index.blerg');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg?yay=bar');
    });

    it('should handle an Html asset with an url that has an extension, a query string, and a fragment identifier', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index.blah?yay=bar#really'
        });
        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');
        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', 'index.blerg');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg?yay=bar#really');
        htmlAsset.extension = "";
        expect(htmlAsset.extension, 'to equal', '');
        expect(htmlAsset.fileName, 'to equal', 'index');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index?yay=bar#really');
    });

    it('should handle an Html asset with an url that has an extension, a query string, and a fragment identifier', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo',
            url: 'http://example.com/index.blah?yay=bar#really'
        });
        expect(htmlAsset.extension, 'to equal', '.blah');
        expect(htmlAsset.fileName, 'to equal', 'index.blah');
        htmlAsset.fileName = 'index.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', 'index.blerg');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg?yay=bar#really');
        htmlAsset.extension = "";
        expect(htmlAsset.extension, 'to equal', '');
        expect(htmlAsset.fileName, 'to equal', 'index');
        expect(htmlAsset.url, 'to equal', 'http://example.com/index?yay=bar#really');
    });

    it('should handle an Html asset with no url', function () {
        var htmlAsset = new AssetGraph.Html({
            text: 'foo'
        });
        expect(htmlAsset.extension, 'to equal', '.html');
        expect(htmlAsset.fileName, 'to be undefined');
        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to be undefined');
        expect(htmlAsset.url, 'to be falsy');
    });

    it('should handle an Html asset with no url, but an extension of ".yay"', function () {
        var htmlAsset = new AssetGraph.Html({
            extension: '.yay',
            text: 'foo'
        });
        expect(htmlAsset.extension, 'to equal', '.yay');
        expect(htmlAsset.fileName, 'to be undefined');
        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to be undefined');
        expect(htmlAsset.url, 'to be falsy');
    });

    it('should handle an Html asset with no url but a fileName of "thething.yay"', function () {
        var htmlAsset = new AssetGraph.Html({
            fileName: 'thething.yay',
            text: 'foo'
        });
        expect(htmlAsset.extension, 'to equal', '.yay');
        expect(htmlAsset.fileName, 'to equal', "thething.yay");
        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', 'thething.blerg');
        expect(htmlAsset.url, 'to be falsy');
    });

    it('should handle an Html asset with no url but an extension of ""', function () {
        var htmlAsset = new AssetGraph.Html({
            extension: '',
            text: 'foo'
        });
        expect(htmlAsset.extension, 'to equal', '');
        expect(htmlAsset.fileName, 'to be undefined');
        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to be undefined');
        expect(htmlAsset.url, 'to be falsy');
    });

    it('should handle an Html asset with no url but a fileName of ""', function () {
        var htmlAsset = new AssetGraph.Html({
            fileName: '',
            text: 'foo'
        });
        expect(htmlAsset.extension, 'to equal', '');
        expect(htmlAsset.fileName, 'to equal', '');
        htmlAsset.extension = '.blerg';
        expect(htmlAsset.extension, 'to equal', '.blerg');
        expect(htmlAsset.fileName, 'to equal', '.blerg');
        expect(htmlAsset.url, 'to be falsy');
    });

    it('should handle an AssetGraph with a loaded asset that has a link to an unloaded asset when the asset is moved', function () {
        var assetGraph = new AssetGraph(),
            fooHtml = new AssetGraph.Html({
                url: 'http://example.com/foo.html',
                text: '<!DOCTYPE html><html><head></head><body><a href="http://example.com/bar.html">link text</a></body></html>'
            }),
            barHtml = new AssetGraph.Html({ // Not yet loaded
                url: 'http://example.com/bar.html'
            });

        assetGraph.addAsset(fooHtml);
        assetGraph.addAsset(barHtml);
        assetGraph.findRelations({type: 'HtmlAnchor'}, true)[0].to = barHtml;

        barHtml.url = 'http://example.com/subdir/quux.html';
        expect(assetGraph.findRelations({type: 'HtmlAnchor'}, true)[0].href, 'to equal', 'http://example.com/subdir/quux.html');
        expect(assetGraph.findAssets({type: 'Html', url: /\/subdir\/quux\.html$/})[0].isLoaded, 'to be false');
        assetGraph.findRelations({type: 'HtmlAnchor'}, true)[0].hrefType = 'relative';
        expect(assetGraph.findRelations({type: 'HtmlAnchor'}, true)[0].href, 'to equal', 'subdir/quux.html');
        expect(assetGraph.findAssets({type: 'Html', url: /\/subdir\/quux\.html$/})[0].isLoaded, 'to be false');
    });

    describe('#clone()', function () {
        it('should handle a test case with multiple Html assets', function (done) {
            new AssetGraph({root: __dirname + '/Asset/clone/multipleHtmls/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Html', 3);
                    expect(assetGraph, 'to contain asset', 'Png');
                    expect(assetGraph, 'to contain asset', {type: 'Css', isInline: true});

                    var indexHtml = assetGraph.findAssets({type: 'Html'})[0],
                        assetClone = indexHtml.clone();
                    assetClone.url = indexHtml.url.replace(/\.html$/, ".clone.html");

                    expect(assetGraph, 'to contain asset', {url: /\/index\.clone\.html$/});
                    expect(assetGraph, 'to contain relation', {from: {url: /\/index\.clone\.html$/}, to: {url: /\/anotherpage\.html$/}});
                    expect(assetGraph, 'to contain relation', {from: {url: /\/index\.clone\.html$/}, to: {url: /\/yetanotherpage\.html$/}});
                    expect(assetGraph, 'to contain relation', {from: {url: /\/index\.clone\.html$/}, to: {type: 'Css'}});
                    expect(assetGraph, 'to contain asset', 'Png');
                    expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true}, 2);

                    var originalAndCloned = assetGraph.findAssets({url: /\/index(?:\.clone)?.html/});
                    expect(originalAndCloned[0].text, 'to equal', originalAndCloned[1].text);
                })
                .run(done);
        });

        it('should handle a test case with an advanced require.js construct', function (done) {
            new AssetGraph({root: __dirname + '/Asset/clone/requireJs/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 7);
                    var clone = assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.clone();

                    expect(assetGraph.findRelations({}, true).filter(function (relation) {
                        return !relation.to.isAsset;
                    }), 'to equal', 0);

                    expect(assetGraph.findRelations({from: assetGraph.findAssets().pop()}), 'to have length',
                             assetGraph.findRelations({from: {url: /\/main\.js$/}}).length);


                    assetGraph.findAssets({url: /\/thelib\.js/})[0].clone();

                    expect(assetGraph.findAssets().pop().text, 'to equal', assetGraph.findAssets({url: /\/thelib\.js$/})[0].text);

                    expect(
                        _.pluck(assetGraph.findRelations({from: assetGraph.findAssets().pop()}), 'type'),
                        'to equal',
                        _.pluck(assetGraph.findRelations({from: {url: /\/thelib\.js$/}}), 'type')
                    );
                })
                .run(done);
        });

        it('should handle a test case with a Css asset with an inline image', function (done) {
            new AssetGraph({root: __dirname + '/Asset/clone/cssWithInlineImage/'})
                .loadAssets('index.css')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 2);

                    assetGraph.findAssets({type: 'Css'})[0].clone();

                    expect(assetGraph, 'to contain assets', 'Css', 2);

                    expect(assetGraph, 'to contain assets', 'Png', 2);
                    assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
                        expect(assetGraph, 'to contain relations', {from: cssAsset, to: {isInline: true, isImage: true}}, 1);
                    });
                })
                .run(done);
        });
    });

    it('should handle a test case with Html assets with meta tags specifying iso-8859-1', function (done) {
        new AssetGraph({root: __dirname + '/encoding/'})
            .loadAssets('iso-8859-1.html', 'iso-8859-1-simple-meta.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findAssets().forEach(function (asset) {
                    expect(asset.text, 'to contain', 'æøåÆØÅ');
                });

                expect(assetGraph.findAssets()[0].parseTree.body.firstChild.nodeValue, 'to equal', 'æøåÆØÅ');
                expect(assetGraph.findAssets()[0].rawSrc.toString('binary'), 'to contain', "\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5");
            })
            .run(done);
    });

    it('should handle a Css asset with @charset declaration of iso-8859-1', function (done) {
        new AssetGraph({root: __dirname + '/encoding/'})
            .loadAssets('iso-8859-1.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets()[0].text, 'to contain', 'æøå');
                expect(assetGraph.findAssets({})[0].parseTree.cssRules[0].style.foo, 'to equal', 'æøå');
            })
            .run(done);
    });
});
