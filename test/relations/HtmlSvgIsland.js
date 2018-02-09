/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlSvgIsland', function () {
    it('should handle a test case with an existing <svg> element', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlSvgIsland/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain relation', 'HtmlSvgIsland');
        expect(assetGraph, 'to contain assets', 'Svg', 2);
        expect(assetGraph, 'to contain asset', {type: 'Svg', isInline: true});
        assetGraph.findAssets({fileName: 'gaussianBlur.svg'})[0].fileName = 'blah.svg';
        expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain', 'xlink:href="blah.svg"');

        // Make sure that the set of attributes on the <svg> element in the containing document are synced with those
        // on the documentElement of the inline asset:
        const inlineSvgAsset = assetGraph.findAssets({type: 'Svg', isInline: true})[0];
        inlineSvgAsset.parseTree.documentElement.setAttribute('foo', 'bar');
        inlineSvgAsset.parseTree.documentElement.removeAttribute('hey', 'there');
        inlineSvgAsset.markDirty();
        expect(assetGraph.findAssets({type: 'Html'})[0].parseTree, 'queried for', 'svg', 'to satisfy', [
            {
                attributes: {
                    foo: 'bar',
                    hey: undefined
                }
            }
        ]);
    });
});
