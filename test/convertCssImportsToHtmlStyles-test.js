var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('Converting Css @import rules to <link rel="stylesheet">').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/convertCssImportsToHtmlStyles/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'the graph should contain 4 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 4);
        },
        'then run the convertCssImportsToHtmlStyles transform': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.convertCssImportsToHtmlStyles({type: 'Html'})).run(this.callback);
            },
            'the graph should contain 4 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 4);
            },
            'the graph should contain 4 HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 4);
            },
            'the graph should contain no CssImport relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImport'}).length, 0);
            },
            'the HtmlStyle pointing at foo2.css should have media="print"': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle', to: {url: /\/foo2\.css$/}})[0].node.getAttribute('media'), 'print');
            },
            'then get the Html asset as text': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({type: 'Html'})[0], this.callback);
                },
                'the <link rel="stylesheet"> tags should be in the right order': function (text) {
                    assert.deepEqual(text.match(/href=\"([^\'\"]+)\"/g),
                                     ['href="foo2.css"', 'href="foo.css"', 'href="bar.css"']);
                },
                'then run the bundleAssets transform on the HtmlStyles': {
                    topic: function (_, assetGraph) {
                        assetGraph.queue(transforms.bundleAssets({type: 'Css', incoming: {type: 'HtmlStyle'}})).run(this.callback);
                    },
                    'there should be a single HtmlStyle relation': function (assetGraph) {
                        assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 1);
                    },
                    'there should be a single Css asset': function (assetGraph) {
                        assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
                    },
                    'then get the parseTree of the resulting Css asset': {
                        topic: function (assetGraph) {
                            assetGraph.findAssets({type: 'Css'})[0].getParseTree(this.callback);
                        },
                        'it should contain the rules from the original Css assets in the right order': function (cssStyleSheet) {
                            assert.equal(cssStyleSheet.cssRules.length, 4);
                            assert.equal(cssStyleSheet.cssRules[0].style['background-color'], 'maroon');
                            assert.equal(cssStyleSheet.cssRules[1].style.color, 'teal');
                            assert.equal(cssStyleSheet.cssRules[2].style.color, 'tan');
                            assert.equal(cssStyleSheet.cssRules[3].style.color, 'blue');
                        }
                    },
                    'then change the url of the Html asset': {
                        topic: function (assetGraph) {
                            assetGraph.setAssetUrl(assetGraph.findAssets({type: 'Html'})[0], urlTools.resolveUrl(assetGraph.root, 'subdir/index2.html'));
                            return assetGraph;
                        },
                        'the CssAlphaImageLoader relation should be relative to the new Html url': function (assetGraph) {
                            assert.equal(assetGraph.findRelations({type: 'CssAlphaImageLoader'})[0]._getRawUrlString(), '../foo.png');
                        }
                    }
                }
            }
        }
    }
})['export'](module);
