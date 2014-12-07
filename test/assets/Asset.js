/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib');

describe('assets/Asset', function () {
    describe('#load(cb)', function () {
        it('should error when there is no file handle and the asset is not in a graph', function (done) {
            var asset = new AssetGraph.Asset({});

            asset.load(function (err) {
                expect(err, 'to be an', Error);
                done();
            });
        });
    });

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
        htmlAsset.extension = '';
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
        htmlAsset.extension = '';
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
        htmlAsset.extension = '';
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
        htmlAsset.extension = '';
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
        expect(htmlAsset.fileName, 'to equal', 'thething.yay');
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
            new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/clone/multipleHtmls/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Html', 3);
                    expect(assetGraph, 'to contain asset', 'Png');
                    expect(assetGraph, 'to contain asset', {type: 'Css', isInline: true});

                    var indexHtml = assetGraph.findAssets({type: 'Html'})[0],
                        assetClone = indexHtml.clone();
                    assetClone.url = indexHtml.url.replace(/\.html$/, '.clone.html');

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
            new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/clone/requireJs/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 7);
                    assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.clone();

                    expect(assetGraph.findRelations({}, true).filter(function (relation) {
                        return !relation.to.isAsset;
                    }), 'to have length', 0);

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
            new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/clone/cssWithInlineImage/'})
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
        new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/encoding/'})
            .loadAssets('iso-8859-1.html', 'iso-8859-1-simple-meta.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findAssets().forEach(function (asset) {
                    expect(asset.text, 'to contain', 'æøåÆØÅ');
                });

                expect(assetGraph.findAssets()[0].parseTree.body.firstChild.nodeValue, 'to equal', 'æøåÆØÅ');
                expect(assetGraph.findAssets()[0].rawSrc.toString('binary'), 'to contain', '\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5');
            })
            .run(done);
    });

    it('should handle a Css asset with @charset declaration of iso-8859-1', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/encoding/'})
            .loadAssets('iso-8859-1.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets()[0].text, 'to contain', 'æøå');
                expect(assetGraph.findAssets({})[0].parseTree.cssRules[0].style.foo, 'to equal', 'æøå');
            })
            .run(done);
    });

    describe('#inline()', function () {
        it('should handle a test case with an Html asset that has an external Css asset in a conditional comment', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/inline/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 4);
                    expect(assetGraph, 'to contain assets', 'Html', 2);
                    expect(assetGraph, 'to contain asset', 'Css');
                    expect(assetGraph, 'to contain asset', 'Png');

                    assetGraph.findRelations({type: 'HtmlStyle'})[0].inline();

                    expect(assetGraph, 'to contain asset', {type: 'Css', isInline: true});
                    expect(assetGraph.findRelations({type: 'CssImage'})[0].href, 'to equal', 'some/directory/foo.png');

                    var text = assetGraph.findAssets({type: 'Html'})[0].text,
                        matches = text.match(/url\((.*?foo\.png)\)/g);
                    expect(matches, 'to be an array');
                    expect(matches[1], 'to equal', 'url(some\/directory\/foo.png)');
                    expect(matches, 'to have length', 2);
                })
                .run(done);
        });
    });

    describe('#outgoingRelations', function () {
        it('should handle a combo test case', function () {
            var htmlAsset = new AssetGraph.Html({
                url: 'http://example.com/foo.html',
                text:
                    '<!DOCTYPE html>\n' +
                    '<html><head><style type="text/css">body{background-image: url(foo.png)}</style></head>' +
                    '<body><a href="quux.html">Link text</a></body></html>'
            });

            expect(htmlAsset.outgoingRelations, 'to have length', 2);
            expect(htmlAsset.outgoingRelations[0].type, 'to equal', 'HtmlStyle');
            expect(htmlAsset.outgoingRelations[1].type, 'to equal', 'HtmlAnchor');

            expect(htmlAsset.outgoingRelations[0].to.isAsset, 'to equal', true);
            expect(htmlAsset.outgoingRelations[0].to.type, 'to equal', 'Css');

            expect(htmlAsset.outgoingRelations[0].to.outgoingRelations, 'to have length', 1);
            expect(htmlAsset.outgoingRelations[0].to.outgoingRelations[0].type, 'to equal', 'CssImage');
            expect(htmlAsset.outgoingRelations[0].to.outgoingRelations[0].to.isResolved, 'to be falsy');

            expect(htmlAsset.outgoingRelations[1].to.isResolved, 'to be falsy');

            var assetGraph = new AssetGraph({root: 'http://example.com/'});
            assetGraph.addAsset(new AssetGraph.Html({
                url: 'http://example.com/quux.html',
                text: '<!DOCTYPE html>\n<html><head><title>Boring document</title></head></html>'
            }));
            assetGraph.addAsset(new AssetGraph.Html({
                url: 'http://example.com/baz.html',
                text: '<!DOCTYPE html>\n<html><head><title>Another boring document</title></head></html>'
            }));
            assetGraph.addAsset(htmlAsset);

            expect(assetGraph, 'to contain relation', {type: 'HtmlAnchor', to: assetGraph.findAssets({url: /\/quux\.html$/})[0]});

            expect(assetGraph, 'to contain relation', 'HtmlStyle');

            expect(assetGraph, 'to contain relation', 'HtmlAnchor');

            expect(assetGraph.findRelations({type: 'CssImage'}, true).length - assetGraph.findRelations({type: 'CssImage'}).length, 'to equal', 1);

            var fooHtml = assetGraph.findAssets({url: /\/foo\.html$/})[0];
            fooHtml.text = '<!DOCTYPE html>\n<html><head></head><body><a href="baz.html">Another link text</a></body></html>';

            expect(assetGraph, 'to contain relation', {type: 'HtmlAnchor', to: assetGraph.findAssets({type: 'Html', url: /\/baz\.html$/})});

            new AssetGraph.HtmlAnchor({to: assetGraph.findAssets({url: /\/quux\.html$/})[0]}).attach(fooHtml, 'after', assetGraph.findRelations({type: 'HtmlAnchor', from: fooHtml})[0]);

            expect(fooHtml.text, 'to match', /baz\.html/);
            expect(fooHtml.text, 'to match', /quux\.html/);
            assetGraph.removeAsset(fooHtml);

            expect(fooHtml.outgoingRelations, 'to have length', 2);
            expect(fooHtml.outgoingRelations[0].type, 'to equal', 'HtmlAnchor');
            expect(fooHtml.outgoingRelations[0].to.url, 'to equal', 'http://example.com/baz.html');
            expect(fooHtml.outgoingRelations[1].type, 'to equal', 'HtmlAnchor');
            expect(fooHtml.outgoingRelations[1].to.url, 'to equal', 'http://example.com/quux.html');

            expect(assetGraph, 'to contain no relations', 'HtmlAnchor');

            assetGraph.addAsset(fooHtml);

            expect(assetGraph, 'to contain relations', 'HtmlAnchor', 2);

            var clone = fooHtml.clone();
            clone.url = 'http://example.com/fooclone1.html';

            expect(clone, 'not to be undefined');
            var outgoingRelations = assetGraph.findRelations({from: clone});
            expect(outgoingRelations, 'to have length', 2);
            expect(outgoingRelations[0].to.url, 'to equal', 'http://example.com/baz.html');
            expect(outgoingRelations[1].to.url, 'to equal', 'http://example.com/quux.html');

            fooHtml.url = 'http://example.com/another/place/foo.html';
            clone = fooHtml.clone();
            clone.url = 'http://example.com/another/place/fooclone2.html';

            expect(clone, 'not to be undefined');
            outgoingRelations = assetGraph.findRelations({from: clone});
            expect(outgoingRelations, 'to have length', 2);
            expect(outgoingRelations[0].to.url, 'to equal', 'http://example.com/baz.html');
            expect(outgoingRelations[1].to.url, 'to equal', 'http://example.com/quux.html');
        });
    });

    describe('#rawSrc', function () {
        it('should handle a test case with the same Png image loaded from disc and http', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/rawSrc/'})
                .loadAssets('purplealpha24bit.png', 'http://gofish.dk/purplealpha24bit.png')
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', {type: 'Png', isLoaded: true}, 2);
                    var pngAssets = assetGraph.findAssets({type: 'Png'});
                    expect(pngAssets[0].rawSrc, 'to have length', 8285);
                    expect(pngAssets[0].rawSrc, 'to equal', pngAssets[1].rawSrc);
                })
                .run(done);
        });
    });

    describe('#url', function () {
        it('should handle a test case with 3 assets', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/setAssetUrl/simple/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 3);
                    expect(assetGraph, 'to contain assets', 'Html', 2);
                    expect(assetGraph, 'to contain asset', 'Png');

                    var initialHtml = assetGraph.findAssets({type: 'Html'})[0];
                    initialHtml.url = urlTools.resolveUrl(assetGraph.root, 'bogus/index.html');

                    var relativeUrl = assetGraph.findRelations({type: 'HtmlAnchor'})[0].node.getAttribute('href');
                    expect(relativeUrl, 'to equal', '../otherpage.html');

                    var otherHtml = assetGraph.findAssets({type: 'Html'})[1];
                    otherHtml.url = urlTools.resolveUrl(assetGraph.root, 'fluff/otherpage.html');

                    relativeUrl = assetGraph.findRelations({type: 'HtmlAnchor'})[0].node.getAttribute('href');
                    expect(relativeUrl, 'to equal', '../fluff/otherpage.html');

                    relativeUrl = assetGraph.findRelations({type: 'HtmlImage'})[0].node.getAttribute('src');
                    expect(relativeUrl, 'to equal', '../foo.png');
                })
                .run(done);
        });

        it('should handle a test case with an Html asset that has multiple levels of inline assets', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/setAssetUrl/multipleLevelsOfInline/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'Css');
                    expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true});
                    expect(assetGraph, 'to contain asset', {type: 'Html', isInline: false});
                })
                .moveAssets({type: 'Html', isInline: false}, function (asset, assetGraph) {
                    return urlTools.resolveUrl(assetGraph.root, 'subdir/index.html');
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({type: 'CssImage'})[0].cssRule.style['background-image'], 'to equal', 'url(../foo.png)');
                })
                .run(done);
        });
        it('should handle a test case with an Html asset and a distant Htc asset that has the Html as its base asset', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/assets/Asset/setAssetUrl/nonTrivialBaseAsset/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Css', 3);
                    expect(assetGraph, 'to contain asset', 'Html');
                    expect(assetGraph, 'to contain asset', 'Htc');

                    assetGraph.findAssets({type: 'Html', isInline: false})[0].url = urlTools.resolveUrl(assetGraph.root, 'subdir/index.html');

                    expect(assetGraph.findRelations({type: 'CssBehavior'})[0].cssRule.style.behavior, 'to equal', 'url(theBehavior.htc)');
                })
                .run(done);
        });

        it('should handle a test case with a single Html file', function (done) {
            new AssetGraph({root: 'file:///foo/bar/quux'})
                .loadAssets(new AssetGraph.Html({
                    url: 'file:///foo/bar/quux/baz/index.html',
                    text: '<!DOCTYPE html><html></html>'
                }))
                .queue(function (assetGraph) {
                    assetGraph.findAssets()[0].url = 'otherdir/index.html';
                    expect(assetGraph.findAssets()[0].url, 'to equal', 'file:///foo/bar/quux/baz/otherdir/index.html');

                    assetGraph.findAssets()[0].url = '/hey/index.html';
                    expect(assetGraph.findAssets()[0].url, 'to equal', 'file:///foo/bar/quux/hey/index.html');

                    assetGraph.findAssets()[0].url = '//hey.com/there/index.html';
                    expect(assetGraph.findAssets()[0].url, 'to equal', 'http://hey.com/there/index.html');

                    assetGraph.findAssets()[0].url = 'you/go/index.html';
                    expect(assetGraph.findAssets()[0].url, 'to equal', 'http://hey.com/there/you/go/index.html');

                    assetGraph.findAssets()[0].url = '/and/then/here.html';
                    expect(assetGraph.findAssets()[0].url, 'to equal', 'http://hey.com/and/then/here.html');

                    assetGraph.findAssets()[0].url = '//example.com/then/here.html';
                    expect(assetGraph.findAssets()[0].url, 'to equal', 'http://example.com/then/here.html');

                    assetGraph.findAssets()[0].url = 'https://example2.com/then/here.html';
                    assetGraph.findAssets()[0].url = '//example.com/then/here.html';
                    expect(assetGraph.findAssets()[0].url, 'to equal', 'https://example.com/then/here.html');
                })
                .run(done);
        });
    });
});
