/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlDataBindAttribute', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlDataBindAttribute/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 4);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain relations', 'HtmlDataBindAttribute', 3);

                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    expect(javaScript.parseTree, 'to be an object');
                });

                var javaScript = assetGraph.findAssets({type: 'JavaScript', isInline: true})[0];
                javaScript.parseTree.body[0].expression.properties.push({
                    type: 'Property',
                    key: { type: 'Identifier', name: 'yup' },
                    value: { type: 'Literal', value: 'yup', raw: '\'yup\''}
                });
                javaScript.markDirty();

                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /yup/);
            })
            .run(done);
    });
});
