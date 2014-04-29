var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('flattenStaticIncludes transform').addBatch({
    'After loading a combo test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenStaticIncludes/combo/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 10 JavaScript assets, including two inline ones': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 10);
            expect(assetGraph, 'to contain assets', {type: 'JavaScript', isInline: true}, 2);
        },
        'then run the flattenStaticIncludes transform on the Html asset': {
            topic: function (assetGraph) {
                assetGraph.flattenStaticIncludes({type: 'Html'}).run(this.callback);
            },
            'the injected <script> tags should be in the right order': function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'), 'to equal',
                                [
                                    'a.js',
                                    'b.js',
                                    'c.js',
                                    'd.js',
                                    undefined,
                                    'e.js',
                                    'f.js',
                                    'g.js',
                                    'h.js',
                                    undefined
                                ]);
            }
        }
    },
    'After loading a test case where one of the INCLUDEd files is already included via a <script>': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenStaticIncludes/duplicate/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript assets, one of them inline': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            expect(assetGraph, 'to contain asset', {type: 'JavaScript', isInline: true});
        },
        'the graph should contain 4 Css assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Css', 4);
        },
        'then run the flattenStaticIncludes transform on the Html asset': {
            topic: function (assetGraph) {
                assetGraph.flattenStaticIncludes({type: 'Html'}).run(this.callback);
            },
            'the injected <script> tags should be in the right order': function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'HtmlScript', from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'), 'to equal',
                                [
                                    'a.js',
                                    'b.js',
                                    'c.js',
                                    undefined,
                                    'd.js'
                                ]);
            },
            'the injected <link> tags should be in the right order': function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'), 'to equal',
                                [
                                    'a.css',
                                    'c.css',
                                    'd.css',
                                    'b.css'
                                ]);
            }
        }
    },
    'After loading a test case with .template and .html assets being INCLUDEd': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenStaticIncludes/inlineScriptTemplates/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'then run the flattenStaticIncludes transform on the Html asset': {
            topic: function (assetGraph) {
                assetGraph.flattenStaticIncludes({type: 'Html'}).run(this.callback);
            },
            'there should be 3 inline <script type="text/html"> tags': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlInlineScriptTemplate', 3);
            }
        }
    },
    'After loading a test case with .less and .css assets being INCLUDEd': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenStaticIncludes/lessAndCss/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 Css assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Css', 2);
        },
        'the graph should contain one Less assets': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Less');
        },
        'then run the flattenStaticIncludes transform on the Html asset': {
            topic: function (assetGraph) {
                assetGraph.flattenStaticIncludes({type: 'Html'}).run(this.callback);
            },
            'the injected <link> tags should be in the right order': function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'), 'to equal',
                                [
                                    'a.css',
                                    'b.less',
                                    'c.css'
                                ]);
            }
        }
    }
})['export'](module);
