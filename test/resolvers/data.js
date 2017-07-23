/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('resolvers/data', function () {
    it('should handle a test case with data: url anchors', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/resolvers/data/'})
            .loadAssets('dataUrl.html')
            .populate();

        expect(assetGraph, 'to contain assets', 8);
        expect(assetGraph.findAssets({type: 'Html'})[1].parseTree.body.firstChild.nodeValue, 'to equal', '\u263a\n');
        expect(assetGraph.findAssets({type: 'Html'})[2].parseTree.body.firstChild.nodeValue, 'to equal', 'æøå\n');
        expect(assetGraph.findAssets({type: 'Html'})[3].text, 'to match', /^<!DOCTYPE html>/);
        expect(assetGraph.findAssets({type: 'Text'})[0].text, 'to equal', 'ΩδΦ');
        expect(assetGraph.findAssets({type: 'Text'})[1].text, 'to equal', 'Hellö');
        expect(assetGraph.findAssets({type: 'Text'})[2].text, 'to equal', 'A brief note');
        expect(assetGraph.findAssets({type: 'Text'})[3].text, 'to equal', 'ΩδΦ');
    });

    it('should handle a test case with an unparsable data: url', async function () {
        const warnSpy = sinon.spy().named('warn');
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/resolvers/data/'})
            .on('warn', warnSpy)
            .loadAssets('unparsableDataUrl.html')
            .populate();

        expect(assetGraph, 'to contain asset', { type: 'Asset', url: 'data:foo' });

        expect(warnSpy, 'to have calls satisfying', () => warnSpy(/^Cannot parse data url: data/));
    });
});
