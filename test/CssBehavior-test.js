var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('relations.CssBehavior').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssBehavior/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain a single Htc asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Htc');
        },
        'the graph should contain a single JavaScript asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'JavaScript');
        },
        'then move the Html asset': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html'})[0].url = assetGraph.root + "some/subdirectory/index.html";
                return assetGraph;
            },
            'the HtmlStyle href should be updated': function (assetGraph) {
                expect(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[0].node.getAttribute('href'), 'to equal', '../../css/style.css');
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /href=['"]\.\.\/\.\.\/css\/style\.css/);
            },
            'the CssBehavior href should be updated': function (assetGraph) {
                expect(assetGraph.findRelations({type: 'CssBehavior'})[0].href, 'to equal', '../../htc/theBehavior.htc');
                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to match', /url\(\.\.\/\.\.\/htc\/theBehavior\.htc\)/);
            },
            'the HtmlScript href should be updated': function (assetGraph) {
                expect(assetGraph.findRelations({type: 'HtmlScript'})[0].href, 'to equal', '../../js/theScript.js');
                expect(assetGraph.findAssets({type: 'Htc'})[0].text, 'to match', /src=['"]\.\.\/\.\.\/js\/theScript\.js/);
            }
        }
    }
})['export'](module);
