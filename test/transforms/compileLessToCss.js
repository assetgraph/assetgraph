/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    Path = require('path'),
    mozilla = require('source-map'),
    query = AssetGraph.query;

describe('transforms/compileLessToCss', function () {
    it('should compile all Less assets to Css', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/compileLessToCss/combo/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: query.not(/^http:/)}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
            })
            .compileLessToCss({type: 'Less'}, {sourceMaps: true})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Less');
                expect(assetGraph, 'to contain asset', 'Css');

                var htmlText = assetGraph.findAssets({type: 'Html'})[0].text;
                expect(htmlText, 'not to contain', 'stylesheet/less');
                expect(htmlText, 'not to contain', 'styles.less');
                expect(htmlText, 'to contain', '<link rel="stylesheet" href="styles.css">');

                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to equal',
                    'strong {\n' +
                    '  font-weight: 400;\n' +
                    '}\n' +
                    '#header {\n' +
                    '  color: #333333;\n' +
                    '  border-left: 1px;\n' +
                    '  border-right: 2px;\n' +
                    '}\n' +
                    '#footer {\n' +
                    '  color: #114411;\n' +
                    '  border-color: #7d2717;\n' +
                    '}\n'
                );
                expect(assetGraph.findAssets({type: 'Css'})[0].sourceMap.sources, 'to satisfy', [
                    assetGraph.root + 'morestyles.less',
                    assetGraph.root + 'styles.less'
                ]);
            })
            .serializeSourceMaps()
            .queue(function (assetGraph) {
                var sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
                var consumer = new mozilla.SourceMapConsumer(sourceMap.parseTree);
                expect(consumer.generatedPositionFor({
                    source: assetGraph.root + 'styles.less',
                    line: 6,
                    column: 0
                }), 'to equal', {
                    line: 4,
                    column: 0,
                    lastColumn: null
                });

                expect(consumer.generatedPositionFor({
                    source: assetGraph.root + 'morestyles.less',
                    line: 3,
                    column: 0
                }), 'to equal', {
                    line: 1,
                    column: 0,
                    lastColumn: null
                });
                expect(assetGraph.findAssets({type: 'Css'})[0].sourceMap.sources, 'to satisfy', [
                    assetGraph.root + 'morestyles.less',
                    assetGraph.root + 'styles.less'
                ]);
            });
    });

    it('should emit parse errors as warnings', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileLessToCss/parseError/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.less')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
            })
            .compileLessToCss({type: 'Less'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to equal', 'Unrecognised input. Possibly missing opening \'{\' in ' + Path.relative(process.cwd(), Path.resolve(__dirname, '../../testdata/transforms/compileLessToCss/parseError/index.less')) + ' at line 1, column 0:\n\n}\n');
            })
            .run(done);
    });

    it('should emit parse errors in @imported files as warnings', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileLessToCss/parseErrorInImport/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.less')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
            })
            .compileLessToCss({type: 'Less'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to equal', 'Unrecognised input. Possibly missing opening \'{\' in ' + Path.relative(process.cwd(), Path.resolve(__dirname, '../../testdata/transforms/compileLessToCss/parseErrorInImport/imported.less')) + ' at line 1, column 0:\n\n}\n');
            })
            .run(done);
    });

    it('should emit invalid references as warnings', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileLessToCss/invalidReference/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.less')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
            })
            .compileLessToCss({type: 'Less'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to equal', '.notFound is undefined in ' + Path.relative(process.cwd(), Path.resolve(__dirname, '../../testdata/transforms/compileLessToCss/invalidReference/index.less')) + ' at line 2, column 4:\n.foo {\n    .notFound()\n}');
            })
            .run(done);
    });

    it('should emit invalid references in @imported files as warnings', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileLessToCss/invalidReferenceInImport/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.less')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
            })
            .compileLessToCss({type: 'Less'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to equal', '.notFound is undefined in ' + Path.relative(process.cwd(), Path.resolve(__dirname, '../../testdata/transforms/compileLessToCss/invalidReferenceInImport/imported.less')) + ' at line 2, column 4:\n.foo {\n    .notFound()\n}');
            })
            .run(done);
    });

    it('should populate relations found in the compiled output if a followRelations property is present on the assetGraph instance', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileLessToCss/outgoingRelation/', followRelations: {}})
            .loadAssets('index.less')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
                expect(assetGraph, 'to contain no asset', 'Css');
                expect(assetGraph, 'to contain no relation', 'CssImage');
                expect(assetGraph, 'to contain no asset', 'Png');
            })
            .compileLessToCss({type: 'Less'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no asset', 'Less');
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain relation', 'CssImage');
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .run(done);
    });
});
