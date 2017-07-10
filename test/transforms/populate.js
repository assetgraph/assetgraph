/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const _ = require('lodash');
const urlTools = require('urltools');
const AssetGraph = require('../../lib/AssetGraph');
const query = AssetGraph.query;

describe('transforms/populate', function () {
    it('should handle a test case with an Html asset and some stylesheets when told not to follow relations to Css', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/populate/notToCss/'})
            .loadAssets('index.html')
            .populate({followRelations: {type: query.not('HtmlStyle')}})
            .then(function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Css');

                const htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'}, true);
                expect(htmlStyles, 'to have length', 1);
                expect(htmlStyles[0].to.isLoaded, 'to equal', false);
                expect(htmlStyles[0].to.url, 'to equal', urlTools.resolveUrl(assetGraph.root, 'style.css'));
            });
    });

    it('should handle a test case with custom protocols', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/populate/customProtocols/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {type: query.not('Css')}}})
            .then(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 5);
                expect(assetGraph, 'to contain relations', 4);

                var matches = assetGraph.findAssets({url: /\/index\.html$/})[0].text.match(/<a [^>]*?>/g);
                expect(matches, 'not to be null');
                expect(matches, 'to have length', 4);
            });
    });

    it('should populate a test case with protocol-relative urls from file:', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/populate/protocolRelativeUrls/'})
            .loadAssets('index.html')
            .populate({from: {url: /^file:/}})
            .then(function (assetGraph) {
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
            });
    });
});
