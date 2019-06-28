var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/');

describe('relations/HtmlImage', function () {
    describe('with an alternative attributeName', function () {
        it('should update that attribute when the href is changed', function () {
            var assetGraph = new AssetGraph({ root: __dirname });
            assetGraph.addAsset({
                type: 'Html',
                url: assetGraph.root + 'index.html',
                text: '<!DOCTYPE html><html><body><img src="foo.png"></body></html>'
            });

            var htmlAsset = assetGraph.findAssets()[0];

            var htmlImage = htmlAsset._outgoingRelations[0];
            htmlImage.attributeName = 'data-src';
            htmlImage.node.removeAttribute('src');
            htmlImage.href = 'bar.png';
            htmlAsset.markDirty();

            expect(htmlAsset.text, 'to contain', '<img data-src="bar.png">');
        });
    });
});
