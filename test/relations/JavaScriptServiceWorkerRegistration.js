/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/JavaScriptServiceWorkerRegistration', function () {
    it('should populate the relation', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain relations', 'JavaScriptServiceWorkerRegistration', 1);
        expect(assetGraph, 'to contain assets', 'JavaScript', 2);
    });

    it('should read the href correctly', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'});
        await assetGraph.loadAssets('index.html');

        expect(assetGraph, 'to contain relations', 'JavaScriptServiceWorkerRegistration', 1);

        expect(assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' }), 'to satisfy', [ { href: 'sw.js' } ]);
    });

    it('should write the href correctly', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain relations', 'JavaScriptServiceWorkerRegistration', 1);

        const relation = assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' })[0];

        expect(relation, 'to satisfy', {
            href: 'sw.js',
            from: {
                text: expect.it('not to contain', 'static/serviceworker.js')
            }
        });

        relation.to.url = 'static/serviceworker.js';

        expect(relation, 'to satisfy', {
            href: 'static/serviceworker.js',
            from: {
                text: expect.it('to contain', 'static/serviceworker.js')
            }
        });
    });

    it('should throw when inlining', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        const relation = assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' })[0];

        expect(() => relation.inline(), 'to throw', 'JavaScriptServiceWorkerRegistration.inline(): Not allowed');
    });

    it('should throw when detaching', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        const relation = assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' })[0];

        expect(() => relation.detach(), 'to throw', 'JavaScriptServiceWorkerRegistration.detach(): Not implemented');
    });

    it('should throw when attaching', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        var relation = assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' })[0];

        expect(
            () => relation.attach('before', relation),
            'to throw',
            'JavaScriptServiceWorkerRegistration.attach(): Not implemented'
        );
    });
});
