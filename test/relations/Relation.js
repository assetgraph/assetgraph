/*global describe, it*/
var AssetGraph = require('../../lib'),
    expect = require('../unexpected-with-plugins'),
    _ = require('lodash');

describe('relations/Relation', function () {
    describe('#href', function () {
        it('should handle a test case with urls with different hrefTypes', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/relations/Relation/refreshHref/'})
                .loadAssets('index.html')
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'Html');

                    expect(_.map(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'href'), 'to equal', [
                        'relative.html',
                        '/rootRelative.html',
                        '//example.com/protocolRelative.html',
                        'http://example.com/absolute.html'
                    ]);

                    expect(_.map(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'hrefType'), 'to equal', [
                        'relative',
                        'rootRelative',
                        'protocolRelative',
                        'absolute'
                    ]);

                    assetGraph.findRelations({type: 'HtmlAnchor'}, true).forEach(function (htmlAnchor) {
                        htmlAnchor.to.url = htmlAnchor.to.url.replace(/\.html$/, '2.html');
                        htmlAnchor.refreshHref();
                    });

                    expect(_.map(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'href'), 'to equal', [
                        'relative2.html',
                        '/rootRelative2.html',
                        '//example.com/protocolRelative2.html',
                        'http://example.com/absolute2.html'
                    ]);
                })
                .run(done);
        });

        it('should handle a test case with urls with different hrefTypes, where hrefs have leading white space', function (done)  {
            new AssetGraph({root: __dirname + '/../../testdata/relations/Relation/refreshHref/'})
                .loadAssets('index.html')
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'Html');

                    assetGraph.findAssets({ type: 'Html' }).forEach(function (asset) {
                        asset.text = asset.text.replace(/href="/g, 'href=" ');
                    });

                    expect(_.map(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'hrefType'), 'to equal', [
                        'relative',
                        'rootRelative',
                        'protocolRelative',
                        'absolute'
                    ]);
                })
                .run(done);
        });
    });

    function getTargetFileNames(relations) {
        return _.map(_.map(relations, 'to'), 'url').map(function (url) {
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

    it('should not add index.html to a relation that does not have it', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/Relation/indexHtmlOnFile/'})
            .loadAssets('linker.html')
            .populate()
            .queue(function (assetGraph) {
                var htmlAnchor = assetGraph.findRelations({type: 'HtmlAnchor'})[0];
                expect(htmlAnchor.href, 'to equal', '/');
                htmlAnchor.to.url = 'hey/index.html';
                expect(htmlAnchor.href, 'to equal', '/hey/');
            })
            .run(done);
    });

    describe('#crossorigin', function () {
        it('should evaluate to false for a relation that points from file: to file:', function () {
            return new AssetGraph({root: __dirname})
                .loadAssets({
                    type: 'Html',
                    url: 'file://' + __dirname + '/index.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="other.html">Link</a></body></html>'
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].crossorigin, 'to be false');
                });
        });

        it('should evaluate to true for a relation that points from file: to http:', function () {
            return new AssetGraph({root: __dirname})
                .loadAssets({
                    type: 'Html',
                    url: 'file://' + __dirname + '/index.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="http://example.com/">Link</a></body></html>'
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].crossorigin, 'to be true');
                });
        });

        it('should evaluate to true for a relation that points to a different hostname via http', function () {
            return new AssetGraph({root: __dirname})
                .loadAssets({
                    type: 'Html',
                    url: 'http://example.com/index.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="http://anotherexample.com/">Link</a></body></html>'
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].crossorigin, 'to be true');
                });
        });

        it('should evaluate to false for an absolute relation that points at the same hostname via http', function () {
            return new AssetGraph({root: __dirname})
                .loadAssets({
                    type: 'Html',
                    url: 'http://example.com/index.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="http://example.com/other.html">Link</a></body></html>'
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].crossorigin, 'to be false');
                });
        });

        it('should evaluate to true for an absolute relation that points at the same scheme and hostname, but a different port', function () {
            return new AssetGraph({root: __dirname})
                .loadAssets({
                    type: 'Html',
                    url: 'http://example.com:1337/index.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="http://example.com:1338/other.html">Link</a></body></html>'
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].crossorigin, 'to be true');
                });
        });

        it('should take the default http port into account when the source url omits it', function () {
            return new AssetGraph({root: __dirname})
                .loadAssets({
                    type: 'Html',
                    url: 'http://example.com/index.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="http://example.com:80/other.html">Link</a></body></html>'
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].crossorigin, 'to be false');
                });
        });

        it('should take the default http port into account when the target url omits it', function () {
            return new AssetGraph({root: __dirname})
                .loadAssets({
                    type: 'Html',
                    url: 'http://example.com:80/index.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="http://example.com/other.html">Link</a></body></html>'
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].crossorigin, 'to be false');
                });
        });

        it('should take the default https port into account when the source url omits it', function () {
            return new AssetGraph({root: __dirname})
                .loadAssets({
                    type: 'Html',
                    url: 'https://example.com/index.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="https://example.com:443/other.html">Link</a></body></html>'
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].crossorigin, 'to be false');
                });
        });

        it('should take the default https port into account when the target url omits it', function () {
            return new AssetGraph({root: __dirname})
                .loadAssets({
                    type: 'Html',
                    url: 'https://example.com:443/index.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="https://example.com/other.html">Link</a></body></html>'
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].crossorigin, 'to be false');
                });
        });
    });
});
