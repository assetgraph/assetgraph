var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('transforms.flattenRequireJs').addBatch({
    'After loading the jquery-require-sample test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/convertHtmlRequireJsMainToHtmlScript/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 3);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
        },
        'the graph should contain 1 HtmlRequireJsMain relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'}).length, 1);
        },
        'the graph should contain 1 HtmlScript relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 1);
        },
        'then running the convertHtmlRequireJsMainToHtmlScript transform': {
            topic: function (assetGraph) {
                assetGraph.convertHtmlRequireJsMainToHtmlScript().run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the graph should contain 0 HtmlRequireJsMain relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'}).length, 0);
            },
            'the graph should contain 2 HtmlScript relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 2);
            },
            'index.html should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Html'})[0].text, '<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n    <script src="jquery-require.js"></script><script src="main.js"></script>\n</body>\n</html>\n');
            }
        }
    }
})['export'](module);
