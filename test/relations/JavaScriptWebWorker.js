var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/AssetGraph');

describe('JavaScriptWebWorker', function () {
    it('should pick up new Worker(...) as a relation', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptWebWorker/simple/'});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain asset', {fileName: 'worker.js'});
    });

    it('should refuse to inline, attach and detach', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptWebWorker/simple/'});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        const javaScriptWebWorker = assetGraph.findRelations({type: 'JavaScriptWebWorker'})[0];
        expect(function () {
            javaScriptWebWorker.inline();
        }, 'to throw', /Not supported/);

        expect(function () {
            javaScriptWebWorker.detach();
        }, 'to throw', /Not supported/);

        expect(function () {
            javaScriptWebWorker.attach('first');
        }, 'to throw', /Not supported/);
    });
});
