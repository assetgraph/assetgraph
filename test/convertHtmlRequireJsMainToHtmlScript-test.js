var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    AssetGraph = require('../lib');

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
            expect(assetGraph, 'to contain assets', 3);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 2);
        },
        'the graph should contain 1 HtmlRequireJsMain relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlRequireJsMain');
        },
        'the graph should contain 1 HtmlScript relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlScript');
        },
        'then running the convertHtmlRequireJsMainToHtmlScript transform': {
            topic: function (assetGraph) {
                assetGraph.convertHtmlRequireJsMainToHtmlScript().run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            },
            'the graph should contain 0 HtmlRequireJsMain relations': function (assetGraph) {
                expect(assetGraph, 'to contain no relations', {type: 'HtmlRequireJsMain'});
            },
            'the graph should contain 2 HtmlScript relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
            },
            'index.html should have the expected contents': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to equal', '<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n    <script src="jquery-require.js"></script><script src="main.js"></script>\n</body>\n</html>\n');
            }
        }
    }
})['export'](module);
