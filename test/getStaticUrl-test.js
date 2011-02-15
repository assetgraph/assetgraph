var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    assets = require('../lib/assets'),
    relations = require('../lib/relations'),
    query = require('../lib/query'),
    step = require('step');

// one.getStaticUrl = function (url) { // , placeHolderValue1, placeHolderValue2, ...
//     var placeHolderValues = Arguments.prototype.slice.call(arguments, 1);
//     return url.replace(/\*/g, function () {
//         return placeHolderValues.shift();
//     });
// };

vows.describe('getStaticUrl in JavaScript asset').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/getStaticUrl/'}).transform(
                transforms.loadAssets('index.js'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph should contain a single JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
        },
        'the graph should contain 3 JavaScriptStaticUrl relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptStaticUrl'}).length, 3);
        },
        'the JavaScriptStaticUrl relations should have the right originalUrl properties': function (assetGraph) {
            assert.equal(assetGraph.findRelations({originalUrl: 'json/a.json'}).length, 1);
            assert.equal(assetGraph.findRelations({originalUrl: 'json/b.json'}).length, 1);
            assert.equal(assetGraph.findRelations({originalUrl: 'json/c.json'}).length, 1);
        },
        'the graph should contain 3 JSON assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JSON'}).length, 3);
        },
        'then move one of the assets pointed to by a JavaScriptStaticUrl relation and serialize the JavaScript asset': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({url: /\/a.json/})[0], assetGraph.root + 'static/a76a76a7a.json');
                assetGraph.findAssets({type: 'JavaScript'})[0].serialize(this.callback);
            },
            'the resulting JavaScript should map the url correctly': function (src) {
                assert.equal(new Function(src + 'return theThing;')(), 'static/a76a76a7a.json');
            }
        }
    }
})['export'](module);
