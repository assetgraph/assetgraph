var AssetGraph = require('../lib'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore');

describe('Relation', function () {
    describe('#href', function () {
        it('should handle a test case with urls with different hrefTypes', function (done) {
            new AssetGraph({root: __dirname + '/Relation/refreshHref/'})
                .loadAssets('index.html')
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'Html');

                    expect(_.pluck(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'href'), 'to equal', [
                        'relative.html',
                        '/rootRelative.html',
                        '//example.com/protocolRelative.html',
                        'http://example.com/absolute.html'
                    ]);

                    expect(_.pluck(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'hrefType'), 'to equal', [
                        'relative',
                        'rootRelative',
                        'protocolRelative',
                        'absolute'
                    ]);

                    assetGraph.findRelations({type: 'HtmlAnchor'}, true).forEach(function (htmlAnchor) {
                        htmlAnchor.to.url = htmlAnchor.to.url.replace(/\.html$/, "2.html");
                        htmlAnchor.refreshHref();
                    });

                    expect(_.pluck(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'href'), 'to equal', [
                        'relative2.html',
                        '/rootRelative2.html',
                        '//example.com/protocolRelative2.html',
                        'http://example.com/absolute2.html'
                    ]);
                })
                .run(done);
        });
    });
});
