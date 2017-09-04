/*global describe, it*/
var AssetGraph = require('../../lib'),
    expect = require('../unexpected-with-plugins'),
    _ = require('lodash');
var pathModule = require('path');
var httpception = require('httpception');

describe('relations/Relation', function () {
    describe('#href', function () {
        it('should handle a test case with urls with different hrefTypes', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/relations/Relation/refreshHref/', canonicalRoot: 'http://canonical.com/'})
                .loadAssets('index.html')
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'Html');

                    expect(_.map(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'href'), 'to equal', [
                        'relative.html',
                        '/rootRelative.html',
                        'http://canonical.com/canonical.html',
                        '//example.com/protocolRelative.html',
                        'http://example.com/absolute.html'
                    ]);

                    expect(_.map(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'hrefType'), 'to equal', [
                        'relative',
                        'rootRelative',
                        'absolute',
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
                        'http://canonical.com/canonical2.html',
                        '//example.com/protocolRelative2.html',
                        'http://example.com/absolute2.html'
                    ]);
                })
                .run(done);
        });

        it('should handle a test case with urls with different hrefTypes, where hrefs have leading white space', function (done)  {
            new AssetGraph({root: __dirname + '/../../testdata/relations/Relation/refreshHref/', canonicalRoot: 'http://canonical.com/'})
                .loadAssets('index.html')
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'Html');

                    assetGraph.findAssets({ type: 'Html' }).forEach(function (asset) {
                        asset.text = asset.text.replace(/href="/g, 'href=" ');
                    });

                    expect(_.map(assetGraph.findRelations({type: 'HtmlAnchor'}, true), 'hrefType'), 'to equal', [
                        'relative',
                        'rootRelative',
                        'absolute',
                        'protocolRelative',
                        'absolute'
                    ]);
                })
                .run(done);
        });
    });

    describe('#canonical', function () {
        var testDataDir = pathModule.resolve(__dirname + '/../../testdata/relations/Relation/canonicalHref/');

        it('should populate "canonical" from the local root', function () {
            httpception();

            return new AssetGraph({
                root: testDataDir,
                canonicalRoot: 'http://canonical.com/'
            })
            .loadAssets('canonical.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations(), 'to satisfy', [
                    {
                        canonical: true,
                        crossorigin: false,
                        hrefType: 'absolute',
                        href: 'http://canonical.com/local.js',
                        to: {
                            url: 'file://' + pathModule.join(testDataDir, 'local.js')
                        }
                    }
                ]);
            });
        });

        it('should treat "canonical" as non-crossorigin', function () {
            httpception();

            return new AssetGraph({
                root: testDataDir,
                canonicalRoot: 'http://canonical.com/'
            })
            .loadAssets('canonical.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations({}, true), 'to satisfy', [
                    {
                        hrefType: 'absolute',
                        canonical: true,
                        crossorigin: false
                    }
                ]);
            });
        });

        it('should keep "canonical" relative href when moving target asset', function () {
            httpception();

            return new AssetGraph({
                root: testDataDir,
                canonicalRoot: 'http://canonical.com/'
            })
            .loadAssets('canonical.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 1);

                var relation = assetGraph.findRelations()[0];

                expect(relation, 'to satisfy', {
                    href: 'http://canonical.com/local.js'
                });

                relation.to.fileName = 'movedLocal.js';

                expect(relation, 'to satisfy', {
                    href: 'http://canonical.com/movedLocal.js'
                });
            });
        });

        it('should add the canonical root to the href of a local file', function () {
            return new AssetGraph({
                root: testDataDir,
                canonicalRoot: 'http://canonical.com/'
            })
            .loadAssets('local.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 1);

                var relation = assetGraph.findRelations()[0];

                expect(relation, 'to satisfy', {
                    hrefType: 'relative',
                    href: 'local.js',
                    to: {
                        url: 'file://' + pathModule.join(testDataDir, 'local.js')
                    }
                });

                relation.canonical = true;

                expect(relation, 'to satisfy', {
                    hrefType: 'relative',
                    canonical: true,
                    crossorigin: false,
                    href: 'http://canonical.com/local.js',
                    to: {
                        url: 'file://' + pathModule.join(testDataDir, 'local.js')
                    }
                });
            });
        });

        it('should silently ignore a canonical setting when there is no canonicalRoot', function () {
            return new AssetGraph({
                root: testDataDir
            })
            .loadAssets('local.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 1);

                var relation = assetGraph.findRelations()[0];

                expect(relation, 'to satisfy', {
                    hrefType: 'relative',
                    href: 'local.js',
                    to: {
                        url: 'file://' + pathModule.join(testDataDir, 'local.js')
                    }
                });

                relation.canonical = true;

                expect(relation, 'to satisfy', {
                    hrefType: 'relative',
                    canonical: false,
                    crossorigin: false,
                    href: 'local.js',
                    to: {
                        url: 'file://' + pathModule.join(testDataDir, 'local.js')
                    }
                });
            });
        });

        it('should remove the canonical root from the href of a local file', function () {
            return new AssetGraph({
                root: testDataDir,
                canonicalRoot: 'http://canonical.com/'
            })
            .loadAssets('canonical.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 1);

                var relation = assetGraph.findRelations()[0];

                expect(relation, 'to satisfy', {
                    hrefType: 'absolute',
                    canonical: true,
                    crossorigin: false,
                    href: 'http://canonical.com/local.js',
                    to: {
                        url: 'file://' + pathModule.join(testDataDir, 'local.js')
                    }
                });

                relation.canonical = false;

                expect(relation, 'to satisfy', {
                    hrefType: 'rootRelative',
                    href: '/local.js',
                    to: {
                        url: 'file://' + pathModule.join(testDataDir, 'local.js')
                    }
                });
            });
        });

        it('should handle mailto: protocols where host matches canonicalroot ', function () {
            return new AssetGraph({
                root: testDataDir,
                canonicalRoot: 'http://bar.com/'
            })
            .loadAssets('mailto.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations({}, true), 'to satisfy', [
                    {
                        canonical: false
                    }
                ]);
            });
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

    describe('#refreshHref', function () {
        it('should preserve (and not double) the fragment identifier when the target asset is unresolved', function () {
            const assetGraph = new AssetGraph();
            assetGraph.addAsset({
                type: 'Svg',
                url: 'https://example.com/image.svg',
                text:
                    '<?xml version="1.0" encoding="UTF-8"?>\n' +
                    '<svg width="82px" height="90px" viewBox="0 0 82 90" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
                    '    <defs>\n' +
                    '        <polygon id="path-1" points="2.57083634e-05 42.5179483 48.5419561 42.5179483 48.5419561 0.268335496 2.57083634e-05 0.268335496"></polygon>\n' +
                    '    </defs>\n' +
                    '    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
                    '        <g id="blabla" transform="translate(-377.000000, -479.000000)">\n' +
                    '            <g id="Page-1" transform="translate(418.770235, 524.226071) rotate(1.000000) translate(-418.770235, -524.226071) translate(376.770235, 478.726071)">\n' +
                    '                <polygon id="Fill-1" fill="#CBCACA" points="29.4199768 11.3513514 0 17.8208401 0.478874723 44.5945946 30 43.7301168"></polygon>\n' +
                    '                <g id="Group-39" transform="translate(34.054054, 47.027027)">\n' +
                    '                    <mask id="mask-2" fill="white">\n' +
                    '                        <use xlink:href="#path-1"></use>\n' +
                    '                    </mask>\n' +
                    '                    <g id="Clip-38"></g>\n' +
                    '                    <polygon id="Fill-37" fill="#CBCACA" mask="url(#mask-2)" points="47.7852768 0.268335496 2.57083634e-05 0.657295986 0.594559438 33.8575146 48.5419561 42.5185782"></polygon>\n' +
                    '                </g>\n' +
                    '            </g>\n' +
                    '        </g>\n' +
                    '    </g>\n' +
                    '</svg>'
            });
            var svgAsset = assetGraph.findAssets({ type: 'Svg' })[0];
            svgAsset.url = 'https://example.com/somewhereelse/image.svg';
            expect(svgAsset.text, 'to contain', '<use xlink:href="#path-1"></use>');

            assetGraph.addAsset({
                type: 'Html',
                url: 'https://example.com/index.html',
                text: '<img src="image.svg">'
            });

            var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];

            htmlAsset.outgoingRelations[0].to = svgAsset;

            htmlAsset.outgoingRelations[0].inline();

            expect(svgAsset.text, 'to contain', '<use xlink:href="#path-1"></use>');
        });
    });
});
