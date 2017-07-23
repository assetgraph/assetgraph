/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    sinon = require('sinon'),
    mozilla = require('source-map'),
    AssetGraph = require('../../lib/AssetGraph');

describe('assets/Css', function () {
    it('should handle a test case with a parse error in an inline Css asset', function (done) {
        var err;
        new AssetGraph({root: __dirname + '/../../testdata/assets/Css/parseErrors/'})
            .on('warn', function (_err) {
                err = _err;
            })
            .loadAssets('parseErrorInInlineCss.html')
            .queue(function () {
                expect(err, 'to be an', Error);
                expect(err.message, 'to match', /parseErrorInInlineCss\.html/);
            })
            .run(done);
    });

    it('should handle a test case with a parse error in an external Css asset', function (done) {
        var err;
        new AssetGraph({root: __dirname + '/../../testdata/assets/Css/parseErrors/'})
            .on('warn', function (_err) {
                err = _err;
            })
            .loadAssets('parseErrorInExternalCss.html')
            .populate()
            .queue(function (assetGraph) {
                expect(err, 'to be an', Error);
                expect(err.message, 'to match', /parseError\.css/);
            })
            .run(done);
    });

    it('should handle a test case that has multiple neighbour @font-face rules', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/Css/multipleFontFaceRules/'})
            .loadAssets('index.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph.findAssets({type: 'Css'})[0].text.match(/@font-face/g), 'to have length', 3);

                assetGraph.findAssets({type: 'Css'})[0].markDirty();
                expect(assetGraph.findAssets({type: 'Css'})[0].text.match(/@font-face/g), 'to have length', 3);
            })
            .run(done);
    });

    it('should get the default encoding when there is no other way to determine encoding', function () {
        var asset = new AssetGraph.Css({});

        expect(asset.encoding, 'to be', AssetGraph.Text.prototype.defaultEncoding);
    });

    it('should get set a new encoding correctly', function () {
        var asset = new AssetGraph.Css({
            encoding: 'utf-8',
            text: 'body:before { content: "🐮"; }'
        });

        var markDirtySpy = sinon.spy(asset, 'markDirty');

        asset.encoding = 'iso-8859-1';

        expect(markDirtySpy, 'was called once');
        expect(asset.encoding, 'to be', 'iso-8859-1');
    });

    describe('#minify', function () {
        it('should minify the Css text', function () {
            var cssText = 'body {\n    background: red;\n}\n';
            var asset = new AssetGraph.Css({
                text: cssText
            });

            expect(asset.text, 'to be', cssText);

            asset.minify();
            expect(asset.text, 'to be', 'body{background:red}');
        });

        it('should propagate source map source map information', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/assets/Css/minifyWithSourceMap/'})
                .loadAssets('index.css')
                .minifyAssets()
                .serializeSourceMaps()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'SourceMap');

                    var sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
                    var consumer = new mozilla.SourceMapConsumer(sourceMap.parseTree);
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
        });

        it('should preserve CSS hacks that depend on raws being present', function () {
            var cssText = '.foo {\n  *padding-left: 180px;\n}';
            var asset = new AssetGraph.Css({
                text: cssText
            });

            expect(asset.text, 'to be', cssText);

            asset.minify();
            expect(asset.text, 'to be', '.foo{*padding-left:180px}');
        });

        it('should not destroy existing relations', function () {
            var asset = new AssetGraph.Css({
                text: '.foo {\n  background-image: url(foo.png);\n}.foo {\n  background-image: url(foo.png);\n}'
            });
            var relations = asset.outgoingRelations;
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
        var cssText = 'body{background:red}';
        var asset = new AssetGraph.Css({
            text: cssText
        });

        expect(asset.text, 'to be', cssText);

        asset.prettyPrint();
        expect(asset.text, 'to be', 'body {\n    background: red;\n}\n');
    });

    it('should propagate source map source map information when pretty-printing', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/assets/Css/prettyPrintWithSourceMap/'})
            .loadAssets('index.css')
            .prettyPrintAssets()
            .serializeSourceMaps()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'SourceMap');

                var sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
                var consumer = new mozilla.SourceMapConsumer(sourceMap.parseTree);
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
    });

    it('should throw an error on completely invalid CSS', function () {
        var asset = new AssetGraph.Css({
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
        var assetGraph = new AssetGraph();
        var asset = new AssetGraph.Css({
            text: 'body {}'
        });

        assetGraph.addAsset(asset);

        const warnSpy = sinon.spy(assetGraph, 'warn');
        assetGraph.on('warn', warnSpy);

        expect(() => asset.parseTree, 'not to throw');

        expect(() => asset.text = '}', 'to throw');
    });

    it('should update the text of a Css asset when setting parseTree', function () {
        var cssText = 'h1{color:hotpink}';
        var first = new AssetGraph.Css({
            text: 'h1{color:red}'
        });
        var second = new AssetGraph.Css({
            text: cssText
        });

        var unloadSpy = sinon.spy(first, 'unload');
        var markDirtySpy = sinon.spy(first, 'markDirty');

        first.parseTree = second.parseTree;

        expect(unloadSpy, 'was called once');
        expect(markDirtySpy, 'was called once');

        expect(first.text, 'to be', cssText);
    });

    // https://github.com/ben-eb/postcss-merge-longhand/issues/21
    it('should not convert long hand properties to short hand ones', function () {
        var cssAsset = new AssetGraph.Css({
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
