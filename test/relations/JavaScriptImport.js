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

    describe('#attach', function () {
        describe('with a position of first', function () {
            it('should attach before the first existing import', function () {
                const javaScript = new AssetGraph().addAsset({
                    type: 'JavaScript',
                    url: 'https://example.com/',
                    text: `
                        import foo from 'bar/quux.js';
                    `
                });

                const newRelation = javaScript.addRelation({
                    type: 'JavaScriptImport',
                    to: 'http://blabla.com/lib.js'
                }, 'first');
                expect(javaScript.outgoingRelations, 'to satisfy', { 0: newRelation });
                expect(javaScript.text, 'to begin with', 'import \'http://blabla.com/lib.js\';');
            });
        });

        describe('with a position of last', function () {
            it('should attach after the last existing import', function () {
                const javaScript = new AssetGraph().addAsset({
                    type: 'JavaScript',
                    url: 'https://example.com/',
                    text: `
                        import foo from 'bar/quux.js';
                        alert('foo');
                    `
                });

                const newRelation = javaScript.addRelation({
                    type: 'JavaScriptImport',
                    to: 'http://blabla.com/lib.js'
                }, 'last');
                expect(javaScript.outgoingRelations, 'to satisfy', { 1: newRelation });
                expect(javaScript.text, 'to equal', `
                    import foo from 'bar/quux.js';
                    import 'http://blabla.com/lib.js';
                    alert('foo');`.replace(/^\s+/mg, ''));
            });

            it('should attach at the top when there are no existing imports', function () {
                const javaScript = new AssetGraph().addAsset({
                    type: 'JavaScript',
                    url: 'https://example.com/',
                    text: `
                        alert('foo');
                    `
                });

                const newRelation = javaScript.addRelation({
                    type: 'JavaScriptImport',
                    to: 'http://blabla.com/lib.js'
                }, 'last');
                expect(javaScript.outgoingRelations, 'to equal', [ newRelation ]);
                expect(javaScript.text, 'to equal', `
                    import 'http://blabla.com/lib.js';
                    alert('foo');`.replace(/^\s+/mg, ''));
            });
        });

        describe('with a position of after', function () {
            it('should attach after the given existing import', function () {
                const javaScript = new AssetGraph().addAsset({
                    type: 'JavaScript',
                    url: 'https://example.com/',
                    text: `
                        import foo from 'bar/quux.js';
                        import baz from 'blah.js';
                    `
                });

                const newRelation = javaScript.addRelation({
                    type: 'JavaScriptImport',
                    to: 'http://blabla.com/lib.js'
                }, 'after', javaScript.outgoingRelations[0]);
                expect(javaScript.outgoingRelations, 'to satisfy', { 1: newRelation });
                expect(javaScript.text, 'to equal', `
                    import foo from 'bar/quux.js';
                    import 'http://blabla.com/lib.js';
                    import baz from 'blah.js';`.replace(/^\s+/mg, ''));
            });
        });

        describe('with a position of before', function () {
            it('should attach before the given existing import', function () {
                const javaScript = new AssetGraph().addAsset({
                    type: 'JavaScript',
                    url: 'https://example.com/',
                    text: `
                        import foo from 'bar/quux.js';
                        import baz from 'blah.js';
                    `
                });

                const newRelation = javaScript.addRelation({
                    type: 'JavaScriptImport',
                    to: 'http://blabla.com/lib.js'
                }, 'before', javaScript.outgoingRelations[1]);
                expect(javaScript.outgoingRelations, 'to satisfy', { 1: newRelation });
                expect(javaScript.text, 'to equal', `
                    import foo from 'bar/quux.js';
                    import 'http://blabla.com/lib.js';
                    import baz from 'blah.js';`.replace(/^\s+/mg, ''));
            });
        });
    });

    describe('#detach', function () {
        it('should remove the relation from the source code and the outgoingRelations array', function () {
            const javaScript = new AssetGraph().addAsset({
                type: 'JavaScript',
                url: 'https://example.com/',
                text: 'import foo from \'bar/quux.js\';'
            });
            javaScript.outgoingRelations[0].detach();
            expect(javaScript.outgoingRelations, 'to equal', []);
            expect(javaScript.text, 'to equal', '');
        });
    });
});
