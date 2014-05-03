var AssetGraph = require('../lib'),
    vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore');

vows.describe('Changing the url of assets').addBatch({
    'After loading a test case with urls with different hrefTypes': {
        topic: function () {
            new AssetGraph({root: __dirname + '/refreshHref/'})
                .loadAssets('index.html')
                .run(done);
        },
        'the graph should contain 1 Html assets': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the href property of the urls should come out correctly': function (assetGraph) {
            expect(_.pluck(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'href'), 'to equal', [
                'relative.html',
                '/rootRelative.html',
                '//example.com/protocolRelative.html',
                'http://example.com/absolute.html'
            ]);
        },
        'the hrefType property of the urls should come out correctly': function (assetGraph) {
            expect(_.pluck(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'hrefType'), 'to equal', [
                'relative',
                'rootRelative',
                'protocolRelative',
                'absolute'
            ]);
        },
        'then update the urls of the assetConfigs and call refreshHref on each relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'HtmlAnchor'}, true).forEach(function (htmlAnchor) {
                    htmlAnchor.to.url = htmlAnchor.to.url.replace(/\.html$/, "2.html");
                    htmlAnchor.refreshHref();
                });
                return assetGraph;
            },
            'the href property of the urls should still honor the original hrefType': function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'href'), 'to equal', [
                    'relative2.html',
                    '/rootRelative2.html',
                    '//example.com/protocolRelative2.html',
                    'http://example.com/absolute2.html'
                ]);
            }
        }
    }
})['export'](module);
