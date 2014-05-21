/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    urlTools = require('urltools');

describe('relations/CssBehavior', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssBehavior/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Htc');
                expect(assetGraph, 'to contain asset', 'JavaScript');
                assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'some/subdirectory/index.html');

                expect(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[0].node.getAttribute('href'), 'to equal', '../../css/style.css');
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /href=['"]\.\.\/\.\.\/css\/style\.css/);

                expect(assetGraph.findRelations({type: 'CssBehavior'})[0].href, 'to equal', '../../htc/theBehavior.htc');
                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to match', /url\(\.\.\/\.\.\/htc\/theBehavior\.htc\)/);

                expect(assetGraph.findRelations({type: 'HtmlScript'})[0].href, 'to equal', '../../js/theScript.js');
                expect(assetGraph.findAssets({type: 'Htc'})[0].text, 'to match', /src=['"]\.\.\/\.\.\/js\/theScript\.js/);
            })
            .run(done);
    });
});
