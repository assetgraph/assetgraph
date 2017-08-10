/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlScript', function () {
    it('should handle a test case with existing <script> elements', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlScript/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlScript', 4);
                expect(_.map(assetGraph.findRelations(), 'href'), 'to equal', [
                    'externalNoType.js',
                    undefined,
                    'externalWithTypeTextJavaScript.js',
                    undefined
                ]);
            })
            .run(done);
    });

    it('should attach script node after another when using the `after` position', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlScript/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                const firstScript = assetGraph.findRelations({ type: 'HtmlScript' })[0];

                expect(firstScript.node.hasAttribute('src'), 'to be', true);
                expect(firstScript.node.getAttribute('src'), 'to be', 'externalNoType.js');

                firstScript.inline();

                expect(firstScript.node.hasAttribute('src'), 'to be', false);
            })
            .run(done);
    });

    it('should attach script node before the first existing script node when using the `first` position', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlScript/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                const html = assetGraph.findAssets({ type: 'Html' })[0];
                const firstScript = assetGraph.findRelations({ type: 'HtmlScript' })[0];
                const document = html.parseTree;

                // Test attaching 'first' with first existing script in body
                const relation = html.addRelation({
                    type: 'HtmlScript',
                    to: {
                        type: 'JavaScript',
                        url: 'firstRelationAsset.js',
                        text: '"use strict"'
                    }
                }, 'first');

                expect(relation.node.parentNode, 'not to be', document.head);
                expect(relation.node.parentNode, 'to be', document.body);
                expect(relation.node, 'not to be', document.body.firstChild);
                expect(relation.node, 'to be', firstScript.node.previousSibling);

                // Test attaching 'first' with first existing script in head
                document.head.appendChild(firstScript.node);
                relation.attach('first');

                expect(relation.node.parentNode, 'not to be', document.body);
                expect(relation.node.parentNode, 'to be', document.head);
                expect(relation.node, 'to be', firstScript.node.previousSibling);
            })
            .run(done);
    });

    it('should attach script node as the last node in document.body if no other scripts exist when using the `first` position', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlScript/'})
            .loadAssets(new AssetGraph.Html({
                url: 'index.html',
                text: '<html><head></head><body><h1>Hello world</h1></body></html>'
            }))
            .queue(function (assetGraph) {
                const html = assetGraph.findAssets({ type: 'Html' })[0];
                const document = html.parseTree;
                const relation = html.addRelation({
                    type: 'HtmlScript',
                    to: {
                        type: 'JavaScript',
                        url: 'firstRelationAsset.js',
                        text: '"use strict";'
                    }
                }, 'first');

                expect(relation.node.parentNode, 'not to be', document.head);
                expect(relation.node.parentNode, 'to be', document.body);
                expect(relation.node, 'to be', document.body.lastChild);
            })
            .run(done);
    });

    it('should attach script node as the last node in document.body if no other scripts exist when using the `first` position', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlScript/'})
            .loadAssets(new AssetGraph.Html({
                url: 'index.html',
                text: '<html><head><title>first test</title></head></html>'
            }))
            .queue(function (assetGraph) {
                const html = assetGraph.findAssets({ type: 'Html' })[0];
                const document = html.parseTree;
                const relation = html.addRelation({
                    type: 'HtmlScript',
                    to: {
                        type: 'JavaScript',
                        url: 'firstRelationAsset.js',
                        text: '"use strict";'
                    }
                }, 'first');

                expect(relation.node.parentNode, 'not to be', document.head);
                expect(relation.node.parentNode, 'to be', document.body);
                expect(relation.node, 'to be', document.body.lastChild);
            });
    });

    it('should attach script node before another when using the `before` position', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlScript/'})
            .loadAssets(new AssetGraph.Html({
                url: 'index.html',
                text: '<html><head><title>first test</title><script>"use strict";</script><style>body { background: red; }</style></head></html>'
            }))
            .queue(function (assetGraph) {
                const html = assetGraph.findAssets({ type: 'Html' })[0];
                const firstScript = assetGraph.findRelations({ type: 'HtmlScript' })[0];
                const document = html.parseTree;
                const relation = html.addRelation({
                    type: 'HtmlScript',
                    to: {
                        type: 'JavaScript',
                        url: 'firstRelationAsset.js',
                        text: '"use strict";'
                    }
                }, 'before', firstScript);

                expect(relation.node.parentNode, 'not to be', document.body);
                expect(relation.node.parentNode, 'to be', document.head);
                expect(relation.node, 'to be', firstScript.node.previousSibling);
            })
            .run(done);
    });

    it('should attach script node after another when using the `after` position', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlScript/'})
            .loadAssets(new AssetGraph.Html({
                url: 'index.html',
                text: '<html><head><title>first test</title><script>"use strict";</script><style>body { background: red; }</style></head></html>'
            }))
            .queue(function (assetGraph) {
                const html = assetGraph.findAssets({ type: 'Html' })[0];
                const firstScript = assetGraph.findRelations({ type: 'HtmlScript' })[0];
                const document = html.parseTree;
                const relation = html.addRelation({
                    type: 'HtmlScript',
                    to: {
                        type: 'JavaScript',
                        url: 'firstRelationAsset.js',
                        text: '"use strict";'
                    }
                }, 'after', firstScript);

                expect(relation.node.parentNode, 'not to be', document.body);
                expect(relation.node.parentNode, 'to be', document.head);
                expect(relation.node, 'to be', firstScript.node.nextSibling);
            })
            .run(done);
    });
});
