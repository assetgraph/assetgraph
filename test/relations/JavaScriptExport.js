const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('JavaScriptExport', function () {
    it('should detect an ExportNamedDeclaration node', function () {
        const javaScript = new AssetGraph().addAsset({
            type: 'JavaScript',
            url: 'https://example.com/',
            text: `
                export { foo } from 'bar/quux.js';
            `
        });

        expect(javaScript.outgoingRelations, 'to satisfy', [
            { type: 'JavaScriptExport', href: 'bar/quux.js', to: { url: 'https://example.com/bar/quux.js' } }
        ]);
    });

    it('should detect an ExportAllDeclaration node', function () {
        const javaScript = new AssetGraph().addAsset({
            type: 'JavaScript',
            url: 'https://example.com/',
            text: `
                export * from 'bar/quux.js';
            `
        });

        expect(javaScript.outgoingRelations, 'to satisfy', [
            { type: 'JavaScriptExport', href: 'bar/quux.js', to: { url: 'https://example.com/bar/quux.js' } }
        ]);
    });

    it('should update the href of a relation', function () {
        const javaScript = new AssetGraph().addAsset({
            type: 'JavaScript',
            url: 'https://example.com/',
            text: `
                export { foo } from 'bar/quux.js';
            `
        });

        javaScript.outgoingRelations[0].href = 'blabla.js';
        javaScript.markDirty();
        expect(javaScript.text, 'to contain', 'export {\n    foo\n} from \'blabla.js\';');
    });
});
