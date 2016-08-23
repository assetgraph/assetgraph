/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptTrHtml', function () {
    it('should handle a test case with a simple JavaScriptTrHtml relation', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptTrHtml/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relation', 'JavaScriptTrHtml');
                expect(assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].href, 'to be undefined');

                assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].omitFunctionCall();
            })
            .inlineRelations({type: 'JavaScriptTrHtml'})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><body>Boo!<\/body><\/html>\\n\1/);

                var htmlAsset = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                    document = htmlAsset.parseTree;
                document.body.appendChild(document.createElement('div')).appendChild(document.createTextNode('foo'));
                htmlAsset.markDirty();

                expect(assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].href, 'to be undefined');

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><head><\/head><body>Boo!\\n<div>foo<\/div><\/body><\/html>\1/);

                assetGraph.findAssets({type: 'Html', isInline: true})[0].url = 'http://example.com/template.html';
            });
    });

    it('should handle a test case with a JavaScriptTrHtml relation consisting of TRHTML(GETTEXT(...))', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptTrHtml/TrHtmlGetText/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relation', 'JavaScriptTrHtml');
                expect(assetGraph, 'to contain no relations', {type: 'JavaScriptGetText'});

                // Set the omitFunctionCall property of the JavaScriptTrHtml relation to true and inline the JavaScriptTrHtml relation
                assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].omitFunctionCall();
            })
            .inlineRelations({type: 'JavaScriptTrHtml'})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><head><\/head><body>Boo!<\/body><\/html>\\n\1/);

                var htmlAsset = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                    document = htmlAsset.parseTree;
                document.body.appendChild(document.createElement('div')).appendChild(document.createTextNode('foo'));
                htmlAsset.markDirty();

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><head><\/head><body>Boo!\\n<div>foo<\/div><\/body><\/html>\1/);
            });
    });

    describe('#omitFunctionCall', function () {
        it('should replace TRHTML("...") with "..."', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptTrHtml/omitFunctionCall/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to contain', "TRHTML('<div></div>')");
                    assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].omitFunctionCall();
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'not to contain', "TRHTML('<div></div>')")
                        .and('to contain', "var foo = '<div></div>'");
                    var html = assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].to;
                    html.parseTree.firstChild.innerHTML = 'argh';
                    html.markDirty();
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to contain', "var foo = '<div>argh</div>'");
                });
        });
    });
});
