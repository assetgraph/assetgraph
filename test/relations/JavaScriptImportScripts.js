var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/AssetGraph');

describe('JavaScriptImportScripts', function () {
    it('should pick up importScripts() and self.importScripts as relations', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptImportScripts/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            });
    });

    it('should support attaching and detaching importScripts relations', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptImportScripts/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findRelations({to: { fileName: 'foo.js' }})[0].detach();
                var webWorker = assetGraph.findRelations({type: 'JavaScriptWebWorker'})[0].to;
                expect(webWorker.text, 'not to contain', '\'foo.js\';');
                expect(webWorker.text, 'to contain', 'importScripts(\'bar.js\');');
                webWorker.addRelation({
                    type: 'JavaScriptImportScripts',
                    to: { url: 'foo.js' }
                }, 'before', assetGraph.findRelations({type: 'JavaScriptImportScripts', to: {fileName: 'bar.js'}})[0]);
                expect(webWorker.text, 'to contain', 'importScripts(\'foo.js\', \'bar.js\');');

                webWorker.addRelation({
                    type: 'JavaScriptImportScripts',
                    href: 'after.js'
                }, 'after', assetGraph.findRelations({type: 'JavaScriptImportScripts', to: {fileName: 'bar.js'}})[0]);
                expect(webWorker.text, 'to contain', 'importScripts(\'foo.js\', \'bar.js\', \'after.js\')');
                webWorker.addRelation({
                    type: 'JavaScriptImportScripts',
                    href: 'last.js'
                }, 'last');
                webWorker.addRelation({
                    type: 'JavaScriptImportScripts',
                    href: 'first.js'
                }, 'first');
                expect(webWorker.text, 'to begin with', 'importScripts(\'first.js\');')
                    .and('to end with', 'importScripts(\'last.js\');');
            });
    });

    it('should support attaching and detaching importScripts separated by comma in the source file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptImportScripts/seq/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findRelations({to: { fileName: 'foo.js' }})[0].detach();
                var webWorker = assetGraph.findRelations({type: 'JavaScriptWebWorker'})[0].to;
                expect(webWorker.text, 'not to contain', '\'foo.js\';');
                expect(webWorker.text, 'to contain', 'importScripts(\'bar.js\')');
                webWorker.addRelation({
                    type: 'JavaScriptImportScripts',
                    href: 'foo.js'
                }, 'before', assetGraph.findRelations({type: 'JavaScriptImportScripts', to: {fileName: 'bar.js'}})[0]);
                expect(webWorker.text, 'to contain', 'importScripts(\'foo.js\', \'bar.js\')');

                webWorker.addRelation({
                    type: 'JavaScriptImportScripts',
                    href: 'after.js'
                }, 'after', assetGraph.findRelations({type: 'JavaScriptImportScripts', to: {fileName: 'bar.js'}})[0]);
                expect(webWorker.text, 'to contain', 'importScripts(\'foo.js\', \'bar.js\', \'after.js\')');
                webWorker.addRelation({
                    type: 'JavaScriptImportScripts',
                    href: 'last.js'
                }, 'last');
                webWorker.addRelation({
                    type: 'JavaScriptImportScripts',
                    href: 'first.js'
                }, 'first');
                expect(webWorker.text, 'to begin with', 'importScripts(\'first.js\');')
                    .and('to end with', 'importScripts(\'last.js\');');
            });
    });

    it('should refuse to inline, attach and detach', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptImportScripts/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var javaScriptImportScripts = assetGraph.findRelations({type: 'JavaScriptImportScripts'})[0];
                expect(function () {
                    javaScriptImportScripts.inline();
                }, 'to throw', /Not supported/);

                expect(function () {
                    javaScriptImportScripts.node = {};
                    javaScriptImportScripts.detach();
                }, 'to throw', 'relations.JavaScriptWebWorker.detach: this.node not found in module array of this.arrayNode.');

                expect(function () {
                    javaScriptImportScripts.attach('after', {argumentsNode: []});
                }, 'to throw', 'JavaScriptImportScripts.attach: adjacentRelation.node not found in adjacentRelation.argumentsNode');

                expect(function () {
                    javaScriptImportScripts.attach('foobar');
                }, 'to throw', 'JavaScriptImportScripts.attach: Unsupported \'position\' value: foobar');
            });
    });
});
