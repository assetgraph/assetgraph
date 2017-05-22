var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/AssetGraph');

describe('JavaScriptWebWorker', function () {
    it('should pick up new Worker(...) as a relation', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptWebWorker/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', {fileName: 'worker.js'});
            });
    });

    it('should refuse to inline, attach and detach', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptWebWorker/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var javaScriptWebWorker = assetGraph.findRelations({type: 'JavaScriptWebWorker'})[0];
                expect(function () {
                    javaScriptWebWorker.inline();
                }, 'to throw', /Not supported/);

                expect(function () {
                    javaScriptWebWorker.detach();
                }, 'to throw', /Not supported/);

                expect(function () {
                    javaScriptWebWorker.attach(javaScriptWebWorker.from, 'first');
                }, 'to throw', /Not supported/);
            });
    });
});
