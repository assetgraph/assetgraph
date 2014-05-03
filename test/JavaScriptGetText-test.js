var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('JavaScriptGetText').addBatch({
    'After loading a test case with a JavaScriptGetText relation': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptGetText/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 3);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 2);
        },
        'then inlining the JavaScriptGetText relation': {
            topic: function (assetGraph) {
                assetGraph
                    .inlineRelations({type: 'JavaScriptGetText'})
                    .run(done);
            },
            'the GETTEXT expression should be replaced with a string with the contents of the Html asset': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><body>Boo!<\/body><\/html>\\n\1/);
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
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*(['"])<html><body>Boo!<div>foo<\/div><\/body><\/html>\\n\1/);
                },
                'then externalize the Html asset pointed to by the JavaScriptGetText relation': {
                    topic: function (assetGraph) {
                        assetGraph.findAssets({type: 'Html', isInline: true})[0].url = 'http://example.com/template.html';
                        return assetGraph;
                    },
                    'the GETTEXT expression should be back and point at the new url': function (assetGraph) {
                        expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /var myHtmlString\s*=\s*GETTEXT\((['"])http:\/\/example\.com\/template\.html\1\)/);
                    }
                }
            }
        }
    }
})['export'](module);
