/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptRequireJsCommonJsCompatibilityRequire', function () {
    it('should handle a test case that also has some common.js requires', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptRequireJsCommonJsCompatibilityRequire/withCommonJsShorthand/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 5);
                expect(assetGraph, 'to contain no relations', 'JavaScriptAmdDefine');
                expect(assetGraph, 'to contain relation', 'JavaScriptRequireJsCommonJsCompatibilityRequire');
                expect(assetGraph, 'to contain no relations', {type: 'JavaScriptCommonJsRequire'});
                expect(assetGraph, 'to contain asset', {url: /\/over\/the\/rainbow\/foo\.js$/, isLoaded: true});
            })
            .liftUpJavaScriptRequireJsCommonJsCompatibilityRequire()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'JavaScriptAmdDefine');
                expect(assetGraph, 'to contain asset', {text: /\[\'require\',\'somewhere\/foo\'\]/});
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', {type: 'HtmlScript', from: {type: 'Html'}, to: {text: /return 42/}});
            })
            .run(done);
    });

    it('should handle the ACE editor', function (done) {
        this.timeout(10000);
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptRequireJsCommonJsCompatibilityRequire/ace/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 81);
                expect(assetGraph, 'to contain relations', 'JavaScriptRequireJsCommonJsCompatibilityRequire', 168);
                expect(assetGraph, 'to contain no relations', {type: 'JavaScriptAmdDefine'});
            })
            .liftUpJavaScriptRequireJsCommonJsCompatibilityRequire()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptAmdDefine', 168);
                expect(assetGraph, 'to contain relations', 'JavaScriptRequireJsCommonJsCompatibilityRequire', 168);
            })
            .flattenRequireJs()
            .inlineRelations({type: 'JavaScriptGetText'})
            .queue(function (assetGraph) {
                // Executing all the scripts except the last one should result in no errors
                var vm = require('vm'),
                    context = vm.createContext();
                assetGraph.findRelations({type: 'HtmlScript'}).forEach(function (relation) {
                    var src = relation.to.text;
                    if (/define\((["'])main\1/.test(src)) {
                        return;
                    }
                    vm.runInContext(src, context, relation.to.url);
                });
            })
            .run(done);
    });
});
