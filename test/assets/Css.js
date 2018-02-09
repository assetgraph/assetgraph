/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/Css', function () {
    let sandbox;
    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should handle a test case with a parse error in an inline Css asset', async function () {
        const warnSpy = sandbox.spy().named('warn');
        await new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/assets/Css/parseErrors/')})
            .on('warn', warnSpy)
            .loadAssets('parseErrorInInlineCss.html');

        expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(/parseErrorInInlineCss\.html/);
        });
    });

    it('should handle a test case with a parse error in an external Css asset', async function () {
        const warnSpy = sandbox.spy().named('warn');
        await new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/assets/Css/parseErrors/')})
            .on('warn', warnSpy)
            .loadAssets('parseErrorInExternalCss.html')
            .populate();

        expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(/parseError\.css/);
        });
    });

    it('should handle a test case that has multiple neighbour @font-face rules', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/assets/Css/multipleFontFaceRules/')});
        await assetGraph.loadAssets('index.css')
            .populate({
                followRelations: { crossdomain: false }
            });

        const cssAsset = await expect(assetGraph, 'to contain asset', 'Css');
        expect(cssAsset.text.match(/@font-face/g), 'to have length', 3);

        cssAsset.markDirty();
        expect(cssAsset.text.match(/@font-face/g), 'to have length', 3);
    });

    it('should get the default encoding when there is no other way to determine encoding', function () {
        const asset = new AssetGraph().addAsset({type: 'Css'});

        expect(asset.encoding, 'to be', AssetGraph.Text.prototype.defaultEncoding);
    });

    it('should get set a new encoding correctly', function () {
        const asset = new AssetGraph().addAsset({
            type: 'Css',
            encoding: 'utf-8',
            text: 'body:before { content: "🐮"; }'
        });

        sandbox.spy(asset, 'markDirty');

        asset.encoding = 'iso-8859-1';

        expect(asset.markDirty, 'to have calls satisfying', () => {
            asset.markDirty();
        });
        expect(asset.encoding, 'to be', 'iso-8859-1');
    });

    it('should pretty print Css text', function () {
        const text = 'body{background:red}';
        const asset = new AssetGraph().addAsset({type: 'Css', text });

        expect(asset.text, 'to be', text);

        asset.prettyPrint();
        expect(asset.text, 'to be', 'body {\n    background: red;\n}\n');
    });

    it('should propagate source map information when pretty-printing', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/assets/Css/prettyPrintWithSourceMap/')});
        await assetGraph.loadAssets('index.css');

        for (const asset of assetGraph.findAssets()) {
            asset.prettyPrint();
        }

        await assetGraph.serializeSourceMaps();

        expect(assetGraph, 'to contain asset', 'SourceMap');

        const sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
        expect(sourceMap.generatedPositionFor({
            source: assetGraph.root + 'index.css',
            line: 1,
            column: 6
        }), 'to equal', {
            line: 2,
            column: 4,
            lastColumn: null
        });
    });

    it('should emit a warn event on completely invalid CSS', function () {
        const assetGraph = new AssetGraph();
        const asset = new AssetGraph().addAsset({
            type: 'Css',
            text: 'body {}'
        });

        assetGraph.addAsset(asset);

        const warnSpy = sandbox.spy(assetGraph, 'warn');
        assetGraph.on('warn', warnSpy);

        expect(() => asset.parseTree, 'not to throw');

        expect(() => asset.text = '}', 'to throw');
    });

    it('should update the text of a Css asset when setting parseTree', function () {
        const cssText = 'h1{color:hotpink}';
        const first = new AssetGraph().addAsset({
            type: 'Css',
            text: 'h1{color:red}'
        });
        const second = new AssetGraph().addAsset({
            type: 'Css',
            text: cssText
        });

        sandbox.spy(first, 'unload');
        sandbox.spy(first, 'markDirty');

        first.parseTree = second.parseTree;

        expect([first.unload, first.markDirty], 'to have calls satisfying', () => {
            first.unload();
            first.markDirty();
        });

        expect(first.text, 'to be', cssText);
    });

    it('should not break when attempting to retrieve the text content of an unloaded Css asset', function () {
        expect(new AssetGraph().addAsset({type: 'Css'}).text, 'to be undefined');
    });

    it('should set the format of CssFontFaceSrc if available', () => {
        const css = new AssetGraph().addAsset({
            type: 'Css',
            text: `
                @font-face {
                    font-family: 'icomoon';
                    src: url('icomoon.eot');
                    src: url('icomoon.eot?#iefix') format('embedded-opentype'),
                         url('icomoon.woff') format('woff'),
                         url('icomoon.ttf') format('truetype'),
                         url('icomoon.svg#icomoon') format('svg');
                }
            `
        });

        expect(css.findOutgoingRelationsInParseTree(), 'to satisfy', [
            { format: null },
            { format: 'embedded-opentype' },
            { format: 'woff' },
            { format: 'truetype' },
            { format: 'svg' }
        ]);
    });
});
