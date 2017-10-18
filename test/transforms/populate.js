/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query,
    httpception = require('httpception');

describe('transforms/populate', function () {
    it('should handle a test case with an Html asset and some stylesheets when told not to follow relations to Css', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/populate/notToCss/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {type: query.not('Css')}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Css');
                expect(assetGraph, 'to contain no relations', {type: 'HtmlStyle'});

                var htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'}, true);
                expect(htmlStyles, 'to have length', 1);
                expect(htmlStyles[0].to.isAsset, 'not to equal', true);
                expect(htmlStyles[0].to.isResolved, 'to equal', true);
                expect(htmlStyles[0].to.url, 'to equal', urlTools.resolveUrl(assetGraph.root, 'style.css'));
            })
            .run(done);
    });

    it('should handle a test case with custom protocols', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/populate/customProtocols/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {type: query.not('Css')}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset');
                expect(assetGraph, 'to contain no relations');

                var matches = assetGraph.findAssets({url: /\/index\.html$/})[0].text.match(/<a [^>]*?>/g);
                expect(matches, 'not to be null');
                expect(matches, 'to have length', 4);
            })
            .run(done);
    });

    it('should populate a test case with protocol-relative urls from file:', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/populate/protocolRelativeUrls/'})
            .loadAssets('index.html')
            .populate({from: {url: /^file:/}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

                expect(_.map(assetGraph.findRelations({type: 'HtmlScript'}), 'href'), 'to equal', [
                    '//ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js',
                    'http://ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js',
                    'https://ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js'
                ]);

                expect(
                    assetGraph.findRelations({type: 'HtmlScript', href: /^\/\//})[0].to,
                    'to be',
                    assetGraph.findRelations({type: 'HtmlScript', href: /^http:\/\//})[0].to
                );

                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    javaScript.url = javaScript.url.match(/^(https?:)/)[1] + '//cdn.example.com/' + javaScript.fileName;
                });

                expect(_.map(assetGraph.findRelations({type: 'HtmlScript'}), 'hrefType'), 'to equal', [
                    'protocolRelative',
                    'absolute',
                    'absolute'
                ]);

                expect(assetGraph.findAssets({url: /\/index\.html$/})[0].text.match(/src="(.*?)"/g), 'to equal', [
                    'src="//cdn.example.com/jquery.min.js"',
                    'src="http://cdn.example.com/jquery.min.js"',
                    'src="https://cdn.example.com/jquery.min.js"'
                ]);
            })
            .run(done);
    });

    describe('when followRelations is specified as an array of relation instances', function () {
        it('should support an empty array', function () {
            httpception();

            var assetGraph = new AssetGraph();
            var htmlAsset = new AssetGraph.Html({
                url: 'https://example.com/',
                text: '<script src="foo.js"></script><script src="bar.js"></script>'
            });
            assetGraph.addAsset(htmlAsset);
            return assetGraph.populate({
                followRelations: []
            }).then(function () {
                expect(assetGraph, 'to contain no asset', { url: 'https://example.com/foo.js' })
                    .and('to contain no asset', { url: 'https://example.com/bar.js' });
            });
        });

        it('should support an array with one item', function () {
            httpception({
                request: 'GET https://example.com/foo.js',
                response: {
                    body: 'alert("foo");'
                }
            });

            var assetGraph = new AssetGraph();
            var htmlAsset = new AssetGraph.Html({
                url: 'https://example.com/',
                text: '<script src="foo.js"></script>'
            });
            assetGraph.addAsset(htmlAsset);
            return assetGraph.populate({
                followRelations: [ htmlAsset.outgoingRelations[0] ]
            }).then(function () {
                expect(assetGraph, 'to contain asset', { url: 'https://example.com/foo.js' });
            });
        });

        it('should support an array with multiple items', function () {
            httpception([
                {
                    request: 'GET https://example.com/foo.js',
                    response: {
                        body: 'alert("foo");'
                    }
                },
                {
                    request: 'GET https://example.com/bar.js',
                    response: {
                        body: 'alert("bar");'
                    }
                }
            ]);

            var assetGraph = new AssetGraph();
            var htmlAsset = new AssetGraph.Html({
                url: 'https://example.com/',
                text: '<script src="foo.js"></script><script src="bar.js"></script><script src="quux.js"></script>'
            });
            assetGraph.addAsset(htmlAsset);
            return assetGraph.populate({
                followRelations: htmlAsset.outgoingRelations.slice(0, 2)
            }).then(function () {
                expect(assetGraph, 'to contain asset', { url: 'https://example.com/foo.js' })
                    .and('to contain asset', { url: 'https://example.com/bar.js' })
                    .and('to contain no asset', { url: 'https://example.com/quux.js' });
            });
        });
    });
});
