var expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

describe('populate', function () {
    it('should handle a test case with an Html asset and some stylesheets when tol dnot to follow relations to Css', function (done) {
        new AssetGraph({root: __dirname + '/populate/'})
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
        new AssetGraph({root: __dirname + '/populate/'})
            .loadAssets('customProtocols.html')
            .populate({followRelations: {to: {type: query.not('Css')}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset');
                expect(assetGraph, 'to contain no relations');

                var matches = assetGraph.findAssets({url: /\/customProtocols\.html$/})[0].text.match(/<a [^>]*?>/g);
                expect(matches, 'not to be null');
                expect(matches, 'to have length', 4);
            })
            .run(done);
    });

    it('should populate a test case with protocol-relative urls from file:', function (done) {
        new AssetGraph({root: __dirname + '/populate/'})
            .loadAssets('protocolRelativeUrls.html')
            .populate({from: {url: /^file:/}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

                expect(_.pluck(assetGraph.findRelations({type: 'HtmlScript'}), 'href'), 'to equal', [
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

                expect(_.pluck(assetGraph.findRelations({type: 'HtmlScript'}), 'hrefType'), 'to equal', [
                    'protocolRelative',
                    'absolute',
                    'absolute'
                ]);

                expect(assetGraph.findAssets({url: /\/protocolRelativeUrls\.html$/})[0].text.match(/src="(.*?)"/g), 'to equal', [
                    'src="//cdn.example.com/jquery.min.js"',
                    'src="http://cdn.example.com/jquery.min.js"',
                    'src="https://cdn.example.com/jquery.min.js"'
                ]);
            })
            .run(done);
    });
});
