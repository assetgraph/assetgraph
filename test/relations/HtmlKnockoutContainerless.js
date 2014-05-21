/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs;

describe('relations/HtmlKnockoutContainerless', function () {
    it('should handle a test case with existing <!-- ko ... --> comments', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlKnockoutContainerless/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain relation', 'HtmlKnockoutContainerless');

                var javaScript = assetGraph.findAssets({type: 'JavaScript', isInline: true})[0];
                javaScript.parseTree.body[0].body.properties.push(new uglifyJs.AST_ObjectKeyVal({
                    key: 'yup',
                    value: new uglifyJs.AST_String({value: 'right'})
                }));
                javaScript.markDirty();

                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /yup/);
            })
            .run(done);
    });
});
