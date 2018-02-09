/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const urlTools = require('urltools');

describe('relations/CssBehavior', function () {
    it('should handle a simple test case', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/CssBehavior/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain asset', 'Htc');
        expect(assetGraph, 'to contain asset', 'JavaScript');
        assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'some/subdirectory/index.html');

        expect(assetGraph.findRelations({type: 'HtmlStyle', from: {fileName: 'index.html'}})[0].node.getAttribute('href'), 'to equal', '../../css/style.css');
        expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /href=['"]\.\.\/\.\.\/css\/style\.css/);

        expect(assetGraph.findRelations({type: 'CssBehavior'})[0].href, 'to equal', '/htc/theBehavior.htc');
        expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to match', /url\(\/htc\/theBehavior\.htc\)/);

        expect(assetGraph.findRelations({type: 'HtmlScript'})[0].href, 'to equal', '../js/theScript.js');
        expect(assetGraph.findAssets({type: 'Htc'})[0].text, 'to match', /src=['"]\.\.\/js\/theScript\.js/);
    });
});
