var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('transforms.populate test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/populate/'})
                .loadAssets('index.html')
                .populate({followRelations: {to: {type: query.not('Css')}}})
                .run(done);
        },
        'the graph should contain no Css assets': function (assetGraph) {
            expect(assetGraph, 'to contain no assets', 'Css');
        },
        'the graph should contain no resolved HtmlStyle relations': function (assetGraph) {
            expect(assetGraph, 'to contain no relations', {type: 'HtmlStyle'});
        },
        'the graph should contain an HtmlStyle relation with to:{isResolved:true} and an absolute url': function (assetGraph) {
            var htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'}, true);
            expect(htmlStyles, 'to have length', 1);
            expect(htmlStyles[0].to.isAsset, 'not to equal', true);
            expect(htmlStyles[0].to.isResolved, 'to equal', true);
            expect(htmlStyles[0].to.url, 'to equal', urlTools.resolveUrl(assetGraph.root, 'style.css'));

        }
    },
    'After loading test case with custom protocols and running transforms.populate': {
        topic: function () {
            new AssetGraph({root: __dirname + '/populate/'})
                .loadAssets('customProtocols.html')
                .populate({followRelations: {to: {type: query.not('Css')}}})
                .run(done);
        },
        'the graph should contain a single asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset');
        },
        'the graph should contain no relations': function (assetGraph) {
            expect(assetGraph, 'to contain no relations');
        },
        'the links should still be present in customProtocols.html': function (assetGraph) {
            var matches = assetGraph.findAssets({url: /\/customProtocols\.html$/})[0].text.match(/<a [^>]*?>/g);
            expect(matches, 'not to be null');
            expect(matches, 'to have length', 4);
        }
    },
    'After loading and populating a test case with protocol-relative urls from file:': {
        topic: function () {
            new AssetGraph({root: __dirname + '/populate/'})
                .loadAssets('protocolRelativeUrls.html')
                .populate({from: {url: /^file:/}})
                .run(done);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 3);
        },
        'the graph should 3 HtmlScript relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
        },
        'the HtmlScript relations should point at https://, http://, and //': function (assetGraph) {
            expect(_.pluck(assetGraph.findRelations({type: 'HtmlScript'}), 'href'), 'to equal', [
                '//ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js',
                'http://ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js',
                'https://ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js'
            ]);
        },
        'the protocol-relative and the http HtmlScript relations should point at the same asset': function (assetGraph) {
            expect(
                assetGraph.findRelations({type: 'HtmlScript', href: /^\/\//})[0].to,
                'to be',
                assetGraph.findRelations({type: 'HtmlScript', href: /^http:\/\//})[0].to
            );
        },
        'then move the jquery scripts to a different url': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    javaScript.url = javaScript.url.match(/^(https?:)/)[1] + '//cdn.example.com/' + javaScript.fileName;
                });
                return assetGraph;
            },
            'the hrefs should have the original hrefType': function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'HtmlScript'}), 'hrefType'), 'to equal', [
                    'protocolRelative',
                    'absolute',
                    'absolute'
                ]);
            },
            'the hrefs in the text of the Html asset should point to the right place': function (assetGraph) {
                expect(assetGraph.findAssets({url: /\/protocolRelativeUrls\.html$/})[0].text.match(/src="(.*?)"/g), 'to equal', [
                    'src="//cdn.example.com/jquery.min.js"',
                    'src="http://cdn.example.com/jquery.min.js"',
                    'src="https://cdn.example.com/jquery.min.js"'
                ]);
            }
        }
    }
})['export'](module);
