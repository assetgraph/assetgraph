/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    Path = require('path'),
    errors = require('../../lib/errors'),
    mozilla = require('source-map'),
    query = AssetGraph.query;

describe('transforms/compileScssToCss', function () {
    it('should compile all Scss assets to Css', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/compileScssToCss/combo/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: query.not(/^http:/)}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');
            })
            .compileScssToCss({type: 'Scss'}, {sourceMaps: true})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Scss');
                expect(assetGraph, 'to contain asset', 'Css');

                var htmlText = assetGraph.findAssets({type: 'Html'})[0].text;
                expect(htmlText, 'not to contain', 'styles.scss');
                expect(htmlText, 'to contain', '<link rel="stylesheet" href="styles.css">');

                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to equal',
                    'strong {\n' +
                    '  font-weight: 400; }\n' +
                    '\n' +
                    '#header {\n' +
                    '  color: #333333;\n' +
                    '  border-left: 1px;\n' +
                    '  border-right: 2px;\n' +
                    '  border-bottom-color: #222; }\n' +
                    '\n' +
                    '#footer {\n' +
                    '  color: #114411;\n' +
                    '  border-color: #7d2717; }\n'
                );
            })
            .serializeSourceMaps()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'SourceMap');
                var sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
                var consumer = new mozilla.SourceMapConsumer(sourceMap.parseTree);
                expect(consumer.generatedPositionFor({
                    source: assetGraph.root + 'styles.scss',
                    line: 6,
                    column: 0
                }), 'to equal', {
                    line: 4,
                    column: 0,
                    lastColumn: null
                });

                expect(consumer.generatedPositionFor({
                    source: assetGraph.root + 'morestyles.scss',
                    line: 3,
                    column: 0
                }), 'to equal', {
                    line: 1,
                    column: 0,
                    lastColumn: null
                });
                expect(assetGraph.findAssets({type: 'Css'})[0].sourceMap.sources, 'to satisfy', [
                    assetGraph.root + 'morestyles.scss',
                    assetGraph.root + 'styles.scss',
                    /^<input css \d+>$/ // FIXME
                ]);
            });
    });

    it('should emit parse errors as warnings', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileScssToCss/parseError/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.scss')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');
            })
            .compileScssToCss({type: 'Scss'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');

                expect(warnings, 'to satisfy', [
                    {
                        message: expect.it('to end with', Path.relative(process.cwd(), Path.resolve(__dirname, '../../testdata/transforms/compileScssToCss/parseError/index.scss')) + ' at line 1, column 1')
                    }
                ]);
            })
            .run(done);
    });

    it('should emit parse errors in @imported files as warnings', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileScssToCss/parseErrorInImport/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.scss')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');
            })
            .compileScssToCss({type: 'Scss'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');

                expect(warnings, 'to satisfy', [
                    {
                        message: expect.it('to end with', Path.relative(process.cwd(), Path.resolve(__dirname, '../../testdata/transforms/compileScssToCss/parseErrorInImport/imported.scss')) + ' at line 1, column 1')
                    }
                ]);
            })
            .run(done);
    });

    it('should emit invalid references as warnings', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileScssToCss/invalidReference/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.scss')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');
            })
            .compileScssToCss({type: 'Scss'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to contain', 'no mixin named notFound');
                expect(warnings[0].message, 'to contain', Path.relative(process.cwd(), Path.resolve(__dirname, '../../testdata/transforms/compileScssToCss/invalidReference/index.scss')));
            })
            .run(done);
    });

    it('should emit invalid references in @imported files as warnings', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileScssToCss/invalidReferenceInImport/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.scss')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');
            })
            .compileScssToCss({type: 'Scss'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');
                expect(warnings, 'to satisfy', [ expect.it('to be a', errors.ParseError) ]);
                expect(warnings, 'to have length', 1);
                expect(warnings[0].message, 'to contain', 'no mixin named notFound');
                expect(warnings[0].message, 'to contain', Path.relative(process.cwd(), Path.resolve(__dirname, '../../testdata/transforms/compileScssToCss/invalidReferenceInImport/imported.scss')));
                expect(warnings[0].message, 'to match', /at line 2|:2/);
            })
            .run(done);
    });

    it('should populate relations found in the compiled output if a followRelations', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileScssToCss/outgoingRelation/', followRelations: {}})
            .loadAssets('index.scss')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');
                expect(assetGraph, 'to contain no asset', 'Css');
                expect(assetGraph, 'to contain no relation', 'CssImage');
                expect(assetGraph, 'to contain no asset', 'Png');
            })
            .compileScssToCss({type: 'Scss'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no asset', 'Scss');
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain relation', 'CssImage');
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .run(done);
    });

    it('should pick up and compile scss included via requirejs css plugin', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileScssToCss/requirePlugin/', followRelations: {}})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Scss');
                expect(assetGraph, 'to contain no asset', 'Css');
            })
            .compileScssToCss({type: 'Scss'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no asset', 'Scss');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .run(done);
    });
});
