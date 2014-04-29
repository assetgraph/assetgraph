var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

// Really naive implementation, don't use for anything important:
function bufferIndexOf(haystack, needle) {
    for (var i = 0 ; i < haystack.length ; i += 1) {
        for (var j = 0 ; j < needle.length ; j += 1) {
            if (haystack[i + j] !== needle[j]) {
                break;
            }
        }
        if (j === needle.length) {
            return i;
        }
    }
    return -1;
}

vows.describe('Changing the encoding of assets').addBatch({
    'After loading test case with an iso-8859-1 Html asset with a <meta http-equiv="content-type" ...> tag': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetEncoding/'})
                .loadAssets('iso-8859-1-withMeta.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the body of the asset should be decoded correctly': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /æøå/);
        },
        'then change the encoding to utf-8': {
            topic: function (assetGraph) {
                assetGraph.setAssetEncoding({type: 'Html'}, 'utf-8').run(this.callback);
            },
            'the contents should be recoded to utf-8': function (assetGraph) {
                expect(bufferIndexOf(assetGraph.findAssets({type: 'Html'})[0].rawSrc, new Buffer("æøå", 'utf-8')), 'not to equal', -1);
            },
            'there should be a single meta tag': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /<meta/g);
            },
            'the meta tag should specify utf-8 as the charset': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match',
                               /<meta http-equiv=(['"]|)Content-Type\1 content=(['"]|)text\/html; charset=utf-8\2/i);
            }
        }
    },
    'After loading test case with an iso-8859-1 Html asset with a <meta charset="..."> tag': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetEncoding/'})
                .loadAssets('iso-8859-1-withSimpleMeta.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the body of the asset should be decoded correctly': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /æøå/);
        },
        'then change the encoding to utf-8': {
            topic: function (assetGraph) {
                assetGraph.setAssetEncoding({type: 'Html'}, 'utf-8').run(this.callback);
            },
            'the contents should be recoded to utf-8': function (assetGraph) {
                expect(bufferIndexOf(assetGraph.findAssets({type: 'Html'})[0].rawSrc, new Buffer("æøå", 'utf-8')), 'not to equal', -1);
            },
            'there should be a single meta tag': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /<meta/g);
            },
            'the meta tag should specify utf-8 as the charset': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match',
                               /<meta charset=(["']|)utf-8\1/i);
            }
        }
    },
    'After loading test case with an utf-8 Html asset without a meta tag': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetEncoding/'})
                .loadAssets('utf-8-withoutMeta.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the body of the asset should be decoded correctly': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /æøå/);
        },
        'then change the encoding to iso-8859-1': {
            topic: function (assetGraph) {
                assetGraph.setAssetEncoding({type: 'Html'}, 'iso-8859-1').run(this.callback);
            },
            'the contents should be recoded to iso-8859-1': function (assetGraph) {
                expect(bufferIndexOf(assetGraph.findAssets({type: 'Html'})[0].rawSrc, new Buffer([0xe6, 0xf8, 0xe5])), 'not to equal', -1);
            },
            'there should be a single meta tag': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /<meta/g);
            },
            'the meta tag should specify iso-8859-1 as the charset': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match',
                               /<meta charset=(['"]|)iso-8859-1\1/i);
            }
        }
    }
})['export'](module);
