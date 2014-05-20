/*global describe, it*/
var AssetGraph = require('../../lib'),
    expect = require('../unexpected-with-plugins'),
    _ = require('underscore');

describe('relations/Relation', function () {
    describe('#href', function () {
        it('should handle a test case with urls with different hrefTypes', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/relations/Relation/refreshHref/'})
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

    function getTargetFileNames(relations) {
        return _.pluck(_.pluck(relations, 'to'), 'url').map(function (url) {
            return url.replace(/^.*\//, '');
        });
    }

    describe('#updateTarget', function () {
        it('should handle a combo test case', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/relations/Relation/updateTarget/'})
                .loadAssets('index.html', 'd.js')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                    expect(getTargetFileNames(assetGraph.findRelations()), 'to equal',
                                     ['a.js', 'b.js', 'c.js']);
                    expect(getTargetFileNames(assetGraph.findRelations({type: 'HtmlScript'})), 'to equal',
                                     ['a.js', 'b.js', 'c.js']);

                    var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
                    expect(getTargetFileNames(assetGraph.findRelations({from: htmlAsset, type: 'HtmlScript'})), 'to equal',
                                     ['a.js', 'b.js', 'c.js']);

                    var relation = assetGraph.findRelations({to: {url: /\/b\.js$/}})[0];
                    relation.to = assetGraph.findAssets({url: /\/d\.js$/})[0];
                    relation.refreshHref();

                    expect(getTargetFileNames(assetGraph.findRelations()), 'to equal',
                                     ['a.js', 'd.js', 'c.js']);

                    expect(getTargetFileNames(assetGraph.findRelations({type: 'HtmlScript'})), 'to equal',
                                     ['a.js', 'd.js', 'c.js']);

                    expect(getTargetFileNames(assetGraph.findRelations({from: htmlAsset, type: 'HtmlScript'})), 'to equal',
                                     ['a.js', 'd.js', 'c.js']);
                })
                .run(done);
        });
    });
});
