/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptGetText', function () {
    it('should handle a test case with an existing GETTEXT function call', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptGetText/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain assets', 'Html', 2);
            })
            .inlineRelations({type: 'JavaScriptGetText'})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><body>Boo!<\/body><\/html>\\n\1/);
                var htmlAsset = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                    document = htmlAsset.parseTree;
                document.body.appendChild(document.createElement('div')).appendChild(document.createTextNode('foo'));
                htmlAsset.markDirty();

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><body>Boo!<div>foo<\/div><\/body><\/html>\\n\1/);

                assetGraph.findAssets({type: 'Html', isInline: true})[0].url = 'http://example.com/template.html';

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*GETTEXT\((['"])http:\/\/example\.com\/template\.html\1\)/);
            })
            .run(done);
    });
});
