const AssetGraph = require('../../');
const expect = require('../unexpected-with-plugins');

describe('minifyCss', function () {
    it('should minify the Css text', async function () {
        const assetGraph = new AssetGraph();
        const text = 'body {\n    background: red;\n}\n';
        const cssAsset = assetGraph.addAsset({
            type: 'Css',
            text
        });

        expect(cssAsset.text, 'to be', text);
        await assetGraph.minifyCss();
        expect(cssAsset.text, 'to be', 'body{background:red}');
    });

    it('should propagate source map source map information', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/transforms/minifyCss/withSourceMap/'});
        await assetGraph.loadAssets('index.css');

        await assetGraph.minifyCss();

        await assetGraph.serializeSourceMaps();

        expect(assetGraph, 'to contain asset', 'SourceMap');

        const sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
        expect(sourceMap.generatedPositionFor({
            source: assetGraph.root + 'index.css',
            line: 2,
            column: 4
        }), 'to equal', {
            line: 1,
            column: 5,
            lastColumn: null
        });
    });

    it('should preserve CSS hacks that depend on raws being present', async function () {
        const assetGraph = new AssetGraph();
        const text = '.foo {\n  *padding-left: 180px;\n}';
        const cssAsset = assetGraph.addAsset({
            type: 'Css',
            text
        });

        expect(cssAsset.text, 'to be', text);

        await assetGraph.minifyCss();
        expect(cssAsset.text, 'to be', '.foo{*padding-left:180px}');
    });

    it('should leave the relations in a functional state', async function () {
        const assetGraph = new AssetGraph();
        const cssAsset = assetGraph.addAsset({
            type: 'Css',
            text: '.foo {\n  background-image: url(foo.png);\n}.bar {\n  background-image: url(bar.png);\n}'
        });
        await assetGraph.minifyCss();
        cssAsset.outgoingRelations[0].href = 'blah.png';
        cssAsset.outgoingRelations[1].href = 'quux.png';
        cssAsset.markDirty();
        expect(cssAsset.text, 'to contain', 'blah.png').and('to contain', 'quux.png');
    });
});

