/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptTrHtml', function () {
    it('should handle a test case with a simple JavaScriptTrHtml relation', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptTrHtml/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relation', 'JavaScriptTrHtml');
                expect(assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].href, 'to be undefined');

                assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].omitFunctionCall = true;
            })
            .inlineRelations({type: 'JavaScriptTrHtml'})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><body>Boo!<\/body><\/html>\\n\1/);

                var htmlAsset = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                    document = htmlAsset.parseTree;
                document.body.appendChild(document.createElement('div')).appendChild(document.createTextNode('foo'));
                htmlAsset.markDirty();

                expect(assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].href, 'to be undefined');

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><body>Boo!<div>foo<\/div><\/body><\/html>\\n\1/);

                assetGraph.findAssets({type: 'Html', isInline: true})[0].url = 'http://example.com/template.html';

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*TRHTML\(GETTEXT\((['"])http:\/\/example\.com\/template\.html\1\)\)/);

                var javaScriptTrHtml = assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0];
                javaScriptTrHtml.href = 'blah';
                javaScriptTrHtml.from.markDirty();

                expect(assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].href, 'to equal', 'blah');

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*TRHTML\(GETTEXT\((['"])blah\1\)\)/);
            })
            .run(done);
    });

    it('should handle a test case with a JavaScriptTrHtml relation consisting of TRHTML(GETTEXT(...))', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptTrHtml/TrHtmlGetText/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relation', 'JavaScriptTrHtml');
                expect(assetGraph, 'to contain no relations', {type: 'JavaScriptGetText'});

                // Set the omitFunctionCall property of the JavaScriptTrHtml relation to true and inline the JavaScriptTrHtml relation
                assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].omitFunctionCall = true;
            })
            .inlineRelations({type: 'JavaScriptTrHtml'})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><body>Boo!<\/body><\/html>\\n\1/);

                var htmlAsset = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                    document = htmlAsset.parseTree;
                document.body.appendChild(document.createElement('div')).appendChild(document.createTextNode('foo'));
                htmlAsset.markDirty();

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><body>Boo!<div>foo<\/div><\/body><\/html>\\n\1/);

                assetGraph.findAssets({type: 'Html', isInline: true})[0].url = 'http://example.com/template.html';
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*TRHTML\(GETTEXT\((['"])http:\/\/example\.com\/template\.html\1\)\)/);
            })
            .run(done);
    });
});
