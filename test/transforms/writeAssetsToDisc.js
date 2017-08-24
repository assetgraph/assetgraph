/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('transforms/writeAssetsToDisc', function () {
    it('should emit an error instead of attempting to write a file with an empty file name', async function () {
        const assetGraph = new AssetGraph();
        const warnSpy = sinon.spy().named('warn');
        assetGraph.on('warn', warnSpy);
        assetGraph.addAsset({
            type: 'Html',
            url: 'https://www.example.com/',
            text: 'foo'
        });

        await assetGraph.writeAssetsToDisc({}, '/tmp/foo', 'https://www.example.com/');

        expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(new Error('Skipping https://www.example.com/ -- cannot write an empty file name to disc. Consider renaming it to index.html'));
        });
    });
});
