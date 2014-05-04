var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    fs = require('fs'),
    requirejs = fs.readFileSync(__dirname + '/replaceRequireJsWithAlmond/mixed/require.js', 'utf8'),
    almond = fs.readFileSync(__dirname + '/replaceRequireJsWithAlmond/mixed/almond.js', 'utf8');

describe('replaceRequireJsWithAlmond', function () {
    it('should handle a non-almond test case', function (done) {
        new AssetGraph({root: __dirname + '/replaceRequireJsWithAlmond/mixed/'})
            .registerRequireJsConfig({preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true})
            .loadAssets('require-pure.html')
            .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
            .assumeRequireJsConfigHasBeenFound()
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph.findAssets({type: 'JavaScript'}).pop().text, 'to equal', requirejs);
            })
            .replaceRequireJsWithAlmond()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph.findAssets({type: 'JavaScript'}).pop().text, 'to equal', requirejs);
            })
            .run(done);
    });

    it('should handle a test case with several data-almond attributes', function (done) {
        new AssetGraph({root: __dirname + '/replaceRequireJsWithAlmond/mixed/'})
            .registerRequireJsConfig({preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true})
            .loadAssets('require-almond.html')
            .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
            .assumeRequireJsConfigHasBeenFound()
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlRequireJsAlmondReplacement', 2);

                expect(assetGraph.findRelations({type: 'HtmlScript'})[0].to.text, 'to equal', requirejs);
            })
            .replaceRequireJsWithAlmond()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
                expect(assetGraph, 'to contain no relations', {type: 'HtmlRequireJsAlmondReplacement'});

                expect(assetGraph.findAssets({url: /almond.js$/})[0].text, 'to equal', almond);

                expect(assetGraph.findAssets({url: /app.js$/})[0].text, 'to equal', 'alert(\'APP\');\n');
            })
            .run(done);
    });

    it('should handle an almond test case that uses requirejs as script loader', function (done) {
        var firstWarning;
        new AssetGraph({root: __dirname + '/replaceRequireJsWithAlmond/mixed/'})
            .on('warn', function (err) {
                firstWarning = firstWarning || err;
            })
            .registerRequireJsConfig({preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true})
            .loadAssets('require-almond-external.html')
            .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
            .assumeRequireJsConfigHasBeenFound()
            .populate({
                followRelations: {
                    to: {
                        url: /^file:/
                    }
                }
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
                expect(assetGraph, 'to contain relation', 'HtmlRequireJsAlmondReplacement');
                expect(assetGraph.findRelations({type: 'HtmlScript'})[0].to.text, 'to equal', requirejs);
            })
            .replaceRequireJsWithAlmond()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
                expect(assetGraph, 'to contain no relations', {type: 'HtmlRequireJsAlmondReplacement'});

                expect(assetGraph.findRelations({type: 'HtmlScript'})[0].to.text, 'to equal', requirejs);

                expect(firstWarning, 'to be an', Error);
                expect(firstWarning.transform, 'to equal', 'replaceRequireJsWithAlmond');
            })
            .run(done);
    });

    it('should handle a test case where multiple Html assets use the same require.js and have a data-almond attribute', function (done) {
        new AssetGraph({root: __dirname + '/replaceRequireJsWithAlmond/multipleHtml/'})
            .registerRequireJsConfig({preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true})
            .loadAssets('*.html')
            .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
            .assumeRequireJsConfigHasBeenFound()
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
                expect(assetGraph, 'to contain relations', 'HtmlRequireJsAlmondReplacement', 2);
            })
            .replaceRequireJsWithAlmond()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
                expect(assetGraph, 'to contain no relations', {type: 'HtmlRequireJsAlmondReplacement'});
                assetGraph.findAssets({type: 'Html'}).forEach(function (htmlAsset) {
                    expect(htmlAsset.text.match(/<script/g), 'to have length', 1);
                });
            })
            .run(done);
    });
});
