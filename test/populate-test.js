var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph'),
    query = AssetGraph.query;

vows.describe('transforms.populate test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/populate/'})
                .loadAssets('index.html')
                .populate({followRelations: {to: {type: query.not('Css')}}})
                .run(this.callback);
        },
        'the graph should contain no Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 0);
        },
        'the graph should contain no resolved HtmlStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 0);
        },
        'the graph should contain an HtmlStyle relation with to:{isResolved:true} and an absolute url': function (assetGraph) {
            var htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'}, true);
            assert.equal(htmlStyles.length, 1);
            assert.notEqual(htmlStyles[0].to.isAsset, true);
            assert.equal(htmlStyles[0].to.isResolved, true);
            assert.equal(htmlStyles[0].to.url, urlTools.resolveUrl(assetGraph.root, 'style.css'));
        }
    },
    'After loading test case with custom protocols and running transforms.populate': {
        topic: function () {
            new AssetGraph({root: __dirname + '/populate/'})
                .loadAssets('customProtocols.html')
                .populate({followRelations: {to: {type: query.not('Css')}}})
                .run(this.callback);
        },
        'the graph should contain a single asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 1);
        },
        'the graph should contain no relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations().length, 0);
        }
    }
})['export'](module);
