/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');
const mozilla = require('source-map');
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
        await new AssetGraph({root: __dirname + '/../../testdata/assets/Css/parseErrors/'})
            .on('warn', warnSpy)
            .loadAssets('parseErrorInInlineCss.html');

        expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(/parseErrorInInlineCss\.html/);
        });
    });

    it('should handle a test case with a parse error in an external Css asset', async function () {
        const warnSpy = sandbox.spy().named('warn');
        await new AssetGraph({root: __dirname + '/../../testdata/assets/Css/parseErrors/'})
            .on('warn', warnSpy)
            .loadAssets('parseErrorInExternalCss.html')
            .populate();

        expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(/parseError\.css/);
        });
    });

    it('should handle a test case that has multiple neighbour @font-face rules', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/assets/Css/multipleFontFaceRules/'});
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
        const asset = new AssetGraph.Css({});

        expect(asset.encoding, 'to be', AssetGraph.Text.prototype.defaultEncoding);
    });

    it('should get set a new encoding correctly', function () {
        const asset = new AssetGraph.Css({
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

    describe('#minify', function () {
        it('should minify the Css text', function () {
            const text = 'body {\n    background: red;\n}\n';
            const asset = new AssetGraph.Css({ text });

            expect(asset.text, 'to be', text);

            asset.minify();
            expect(asset.text, 'to be', 'body{background:red}');
        });

        it('should propagate source map source map information', async function () {
            const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/assets/Css/minifyWithSourceMap/'});
            await assetGraph.loadAssets('index.css');

            for (const asset of assetGraph.findAssets()) {
                asset.minify();
            }

            await assetGraph.serializeSourceMaps();

            expect(assetGraph, 'to contain asset', 'SourceMap');

            const sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
            const consumer = new mozilla.SourceMapConsumer(sourceMap.parseTree);
            expect(consumer.generatedPositionFor({
                source: assetGraph.root + 'index.css',
                line: 2,
                column: 4
            }), 'to equal', {
                line: 1,
                column: 5,
                lastColumn: null
            });
        });

        it('should preserve CSS hacks that depend on raws being present', function () {
            const cssText = '.foo {\n  *padding-left: 180px;\n}';
            const asset = new AssetGraph.Css({
                text: cssText
            });

            expect(asset.text, 'to be', cssText);

            asset.minify();
            expect(asset.text, 'to be', '.foo{*padding-left:180px}');
        });

        it('should not destroy existing relations', function () {
            const asset = new AssetGraph.Css({
                text: '.foo {\n  background-image: url(foo.png);\n}.foo {\n  background-image: url(foo.png);\n}'
            });
            const relations = asset.outgoingRelations;
            asset.minify();
            asset.text;
            asset.prettyPrint();
            relations[0].href = 'blah.png';
            relations[1].href = 'quux.png';
            asset.markDirty();
            expect(asset.text, 'to contain', 'blah.png').and('to contain', 'quux.png');
        });
    });

    it('should pretty print Css text', function () {
        const text = 'body{background:red}';
        const asset = new AssetGraph.Css({ text });

        expect(asset.text, 'to be', text);

        asset.prettyPrint();
        expect(asset.text, 'to be', 'body {\n    background: red;\n}\n');
    });

    it('should propagate source map source map information when pretty-printing', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/assets/Css/prettyPrintWithSourceMap/'});
        await assetGraph.loadAssets('index.css');

        for (const asset of assetGraph.findAssets()) {
            asset.prettyPrint();
        }

        await assetGraph.serializeSourceMaps();

        expect(assetGraph, 'to contain asset', 'SourceMap');

        const sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
        const consumer = new mozilla.SourceMapConsumer(sourceMap.parseTree);
        expect(consumer.generatedPositionFor({
            source: assetGraph.root + 'index.css',
            line: 1,
            column: 6
        }), 'to equal', {
            line: 2,
            column: 4,
            lastColumn: null
        });
    });

    it('should throw an error on completely invalid CSS', function () {
        const asset = new AssetGraph.Css({
            text: 'body {}'
        });
        function getParseTree() {
            return asset.parseTree;
        }

        expect(getParseTree, 'not to throw');

        asset.text = '}';

        expect(getParseTree, 'to throw');
    });

    it('should emit a warn event on completely invalid CSS if the asset is part of an assetGraph', function () {
        const assetGraph = new AssetGraph();
        const asset = new AssetGraph.Css({
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
        const first = new AssetGraph.Css({
            text: 'h1{color:red}'
        });
        const second = new AssetGraph.Css({
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

    // https://github.com/ben-eb/postcss-merge-longhand/issues/21
    it('should not convert long hand properties to short hand ones', function () {
        const cssAsset = new AssetGraph.Css({
            text:
                'div{\n' +
                'border-top-width: 5px;\n' +
                'border-right-width: 5px;\n' +
                'border-bottom-width: 5px;\n' +
                'border-left-width: 5px;\n' +
                'border-top-style: solid;\n' +
                'border-right-style: solid;\n' +
                'border-bottom-style: solid;\n' +
                'border-left-style: solid;\n' +
                'border-top-color: rgb(24,27,255);\n' +
                'border-right-color: rgb(24,27,255);\n' +
                'border-bottom-color: rgb(24,27,255);\n' +
                'border-left-color: rgb(24,27,255);\n' +
                '}\n'

        });
        cssAsset.minify();
        expect(cssAsset.text, 'to equal', 'div{border-top-width:5px;border-right-width:5px;border-bottom-width:5px;border-left-width:5px;border-top-style:solid;border-right-style:solid;border-bottom-style:solid;border-left-style:solid;border-top-color:#181bff;border-right-color:#181bff;border-bottom-color:#181bff;border-left-color:#181bff}');
    });

    it('should not break when attempting to retrieve the text content of an unloaded Css asset', function () {
        expect(new AssetGraph.Css({}).text, 'to be undefined');
    });
});
