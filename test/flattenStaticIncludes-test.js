var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph'),
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
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 10);
            assert.equal(assetGraph.findAssets({type: 'JavaScript', isInline: true}).length, 2);
        },
        'then run the flattenStaticIncludes transform on the Html asset': {
            topic: function (assetGraph) {
                assetGraph.flattenStaticIncludes({type: 'Html'}).run(this.callback);
            },
            'the injected <script> tags should be in the right order': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'),
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
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
            assert.equal(assetGraph.findAssets({type: 'JavaScript', isInline: true}).length, 1);
        },
        'the graph should contain 4 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 4);
        },
        'then run the flattenStaticIncludes transform on the Html asset': {
            topic: function (assetGraph) {
                assetGraph.flattenStaticIncludes({type: 'Html'}).run(this.callback);
            },
            'the injected <script> tags should be in the right order': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({type: 'HtmlScript', from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'),
                                [
                                    'a.js',
                                    'b.js',
                                    'c.js',
                                    undefined,
                                    'd.js'
                                ]);
            },
            'the injected <link> tags should be in the right order': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'),
                                [
                                    'a.css',
                                    'c.css',
                                    'd.css',
                                    'b.css'
                                ]);
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
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 2);
        },
        'the graph should contain one Less assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Less'}).length, 1);
        },
        'then run the flattenStaticIncludes transform on the Html asset': {
            topic: function (assetGraph) {
                assetGraph.flattenStaticIncludes({type: 'Html'}).run(this.callback);
            },
            'the injected <link> tags should be in the right order': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: assetGraph.findAssets({type: 'Html'})[0]}), 'href'),
                                [
                                    'a.css',
                                    'b.less',
                                    'c.css'
                                ]);
            }
        }
    }
})['export'](module);
