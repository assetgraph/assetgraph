var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/');

describe('JavaScriptWebWorker', function () {
    it('should pick up new Worker(...) as a relation', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptWebWorker/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', {fileName: 'worker.js'});
            });
    });

    it('should pick up importScripts() and self.importScripts as relations', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptWebWorker/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            });
    });

    it('should support attaching and detaching importScripts relations', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptWebWorker/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findRelations({to: { fileName: 'foo.js' }})[0].detach();
                var webWorker = assetGraph.findRelations({type: 'JavaScriptWebWorker'})[0].to;
                expect(webWorker.text, 'not to contain', '\'foo.js\';');
                expect(webWorker.text, 'to contain', 'importScripts(\'bar.js\');');
                new AssetGraph.JavaScriptImportScripts({
                    to: { url: 'foo.js' }
                }).attach(
                    webWorker,
                    'before',
                    assetGraph.findRelations({type: 'JavaScriptImportScripts', to: {fileName: 'bar.js'}})[0]
                );
                expect(webWorker.text, 'to contain', 'importScripts(\'foo.js\');');
            });
    });

    it('should support attaching and detaching importScripts separated by comma in the source file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptWebWorker/seq/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findRelations({to: { fileName: 'foo.js' }})[0].detach();
                var webWorker = assetGraph.findRelations({type: 'JavaScriptWebWorker'})[0].to;
                expect(webWorker.text, 'not to contain', '\'foo.js\';');
                expect(webWorker.text, 'to contain', 'importScripts(\'bar.js\')');
                new AssetGraph.JavaScriptImportScripts({
                    to: { url: 'foo.js' }
                }).attach(
                    webWorker,
                    'before',
                    assetGraph.findRelations({type: 'JavaScriptImportScripts', to: {fileName: 'bar.js'}})[0]
                );
                expect(webWorker.text, 'to contain', 'importScripts(\'foo.js\')');
            });
    });
});
