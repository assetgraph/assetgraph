var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('relations.CssBehavior').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssBehavior/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain a single Htc asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Htc'}).length, 1);
        },
        'the graph should contain a single JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
        },
        'then move the Html asset': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html'})[0].url = assetGraph.root + "some/subdirectory/index.html";
                return assetGraph;
            },
            'the HtmlStyle href should be updated': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[0].node.getAttribute('href'), '../../css/style.css');
                assert.matches(assetGraph.findAssets({type: 'Html'})[0].text, /href=['"]\.\.\/\.\.\/css\/style\.css/);
            },
            'the CssBehavior href should be updated': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssBehavior'})[0].href, '../../htc/theBehavior.htc');
                assert.matches(assetGraph.findAssets({type: 'Css'})[0].text, /url\(\.\.\/\.\.\/htc\/theBehavior\.htc\)/);
            },
            'the HtmlScript href should be updated': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlScript'})[0].href, '../../js/theScript.js');
                assert.matches(assetGraph.findAssets({type: 'Htc'})[0].text, /src=['"]\.\.\/\.\.\/js\/theScript\.js/);
            }
        }
    }
})['export'](module);
