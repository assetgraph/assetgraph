const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('JavaScriptImport', function () {
    it('should detect a relation', function () {
        const javaScript = new AssetGraph().addAsset({
            type: 'JavaScript',
            url: 'https://example.com/',
            text: `
                import foo from 'bar/quux.js';
            `
        });

        expect(javaScript.outgoingRelations, 'to satisfy', [
            { type: 'JavaScriptImport', href: 'bar/quux.js', to: { url: 'https://example.com/bar/quux.js' } }
        ]);
    });

    it('should update the href of a relation', function () {
        const javaScript = new AssetGraph().addAsset({
            type: 'JavaScript',
            url: 'https://example.com/',
            text: `
                import foo from 'bar/quux.js';
            `
        });

        javaScript.outgoingRelations[0].href = 'blabla.js';
        javaScript.markDirty();
        expect(javaScript.text, 'to contain', 'import foo from \'blabla.js\';');
    });
});
