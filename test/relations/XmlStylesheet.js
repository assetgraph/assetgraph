/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/XmlStylesheet', function () {
    it('should handle a test case with inline elements', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/XmlStylesheet/')});
        await assetGraph.loadAssets('logo.svg');
        await assetGraph.populate();
        await assetGraph.externalizeRelations({ type: 'SvgStyle' });

        expect(assetGraph, 'to contain assets', 'Svg', 1);
        expect(assetGraph, 'to contain relations', 'XmlStylesheet', 1);
        expect(assetGraph, 'to contain assets', 'Css', 1);

        expect(assetGraph.findRelations()[0].href, 'to be', assetGraph.findAssets({ type: 'Css' })[0].id + '.css');

        assetGraph.findAssets({
            type: 'Css'
        })[0].url = 'external.css';

        const relation = assetGraph.findRelations()[0];

        expect(relation.href, 'to be', 'external.css');

        expect(relation.attach, 'to throw');

        relation.inline();

        expect(relation.href, 'to match', /^data:text\/css;base64/);

        relation.detach();

        expect(assetGraph, 'to contain no relations');
    });
});
