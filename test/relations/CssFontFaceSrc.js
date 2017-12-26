/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/CssFontFaceSrc', function () {
    it('should handle a simple test case', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/CssFontFaceSrc/simple/'});
        await assetGraph.loadAssets('index.css');
        await assetGraph.populate();

        expect(assetGraph, 'to contain asset', 'Css');
        expect(assetGraph, 'to contain relation', 'CssFontFaceSrc');

        assetGraph.findRelations({type: 'CssFontFaceSrc'})[0].inline();
        expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to match', /url\('data:/);

        assetGraph.findRelations({type: 'CssFontFaceSrc'})[0].detach();
        expect(assetGraph.findAssets({type: 'Css'})[0].text, 'not to contain', 'url(data:');
    });

    it('should handle a test case with multiple src properties in one rule and multiple urls in one value', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/CssFontFaceSrc/multipleSrc/'});
        await assetGraph.loadAssets('index.css');
        await assetGraph.populate();

        expect(assetGraph, 'to contain asset', 'Css');
        expect(assetGraph, 'to contain relations', 'CssFontFaceSrc', 6);

        assetGraph.findAssets({fileName: 'fontawesome-webfont.ttf'})[0].url = 'http://example.com/foo.ttf';

        expect(assetGraph.findRelations({to: {fileName: 'foo.ttf'}})[0].href, 'to equal', 'http://example.com/foo.ttf');

        expect(assetGraph.findAssets({type: 'Css'})[0].parseTree.nodes[0].nodes[2].value.match(/\burl\((\'|\"|)([^\'\"]+?)\1\)/g), 'to equal', [
            'url(\'fontawesome-webfont.eot?#iefix\')',
            'url(\'fontawesome-webfont.woff\')',
            'url(\'http://example.com/foo.ttf\')',
            'url(\'fontawesome-webfont.svgz#FontAwesomeRegular\')',
            'url(\'fontawesome-webfont.svg#FontAwesomeRegular\')'
        ]);
    });
});
