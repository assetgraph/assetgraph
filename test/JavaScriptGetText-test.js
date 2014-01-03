var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('JavaScriptGetText').addBatch({
    'After loading a test case with a JavaScriptGetText relation': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptGetText/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 3);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'then inlining the JavaScriptGetText relation': {
            topic: function (assetGraph) {
                assetGraph
                    .inlineRelations({type: 'JavaScriptGetText'})
                    .run(this.callback);
            },
            'the GETTEXT expression should be replaced with a string with the contents of the Html asset': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*(['"])<html><body>Boo!<\/body><\/html>\\n\1/);
            },
            'then manipulate the Html asset': {
                topic: function (assetGraph) {
                    var htmlAsset = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                        document = htmlAsset.parseTree;
                    document.body.appendChild(document.createElement('div')).appendChild(document.createTextNode('foo'));
                    htmlAsset.markDirty();
                    return assetGraph;
                },
                'the string literal in the JavaScript should be updated': function (assetGraph) {
                    assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*(['"])<html><body>Boo!<div>foo<\/div><\/body><\/html>\\n\1/);
                },
                'then externalize the Html asset pointed to by the JavaScriptGetText relation': {
                    topic: function (assetGraph) {
                        assetGraph.findAssets({type: 'Html', isInline: true})[0].url = 'http://example.com/template.html';
                        return assetGraph;
                    },
                    'the GETTEXT expression should be back and point at the new url': function (assetGraph) {
                        assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*GETTEXT\((['"])http:\/\/example\.com\/template\.html\1\)/);
                    }
                }
            }
        }
    }
})['export'](module);
