var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('url-tools'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Converting Css @import rules to <link rel="stylesheet">').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/convertCssImportsToHtmlStyles/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
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
        'the graph should contain 3 CssImport relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImport'}).length, 3);
        },
        'the graph should contain 1 root-relative CssImport relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImport', hrefType: 'rootRelative'}).length, 1);
        },
        'then run the convertCssImportsToHtmlStyles transform': {
            topic: function (assetGraph) {
                assetGraph.convertCssImportsToHtmlStyles({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 4 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 4);
            },
            'the graph should contain 4 HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 4);
            },
            'the graph should contain one root-relative HtmlStyle relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle', hrefType: 'rootRelative'}).length, 1);
            },
            'the graph should contain no CssImport relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImport'}).length, 0);
            },
            'the HtmlStyle pointing at foo2.css should have media="print"': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle', to: {url: /\/foo2\.css$/}})[0].node.getAttribute('media'), 'print');
            },
            'then get the Html asset as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Html'})[0].text;
                },
                'the <link rel="stylesheet"> tags should be in the right order': function (text) {
                    assert.deepEqual(text.match(/href=\"([^\'\"]+)\"/g),
                                     ['href="foo2.css"', 'href="foo.css"', 'href="/bar.css"']);
                },
                'then run the bundleRelations transform on the HtmlStyles': {
                    topic: function (_, assetGraph) {
                        assetGraph.bundleRelations({type: 'HtmlStyle'}).run(this.callback);
                    },
                    'there should be 2 HtmlStyle relations': function (assetGraph) {
                        assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 2);
                    },
                    'the first HtmlStyle relation should have media="print"': function (assetGraph) {
                        assert.equal(assetGraph.findRelations({type: 'HtmlStyle'})[0].node.getAttribute('media'), 'print');
                    },
                    'the second HtmlStyle relation should have no media attribute': function (assetGraph) {
                        assert.isFalse(assetGraph.findRelations({type: 'HtmlStyle'})[1].node.hasAttribute('media'));
                    },
                    'there should be 2 Css assets': function (assetGraph) {
                        assert.equal(assetGraph.findAssets({type: 'Css'}).length, 2);
                    },
                    'then get the parseTree of the first resulting Css asset': {
                        topic: function (assetGraph) {
                            return assetGraph.findAssets({type: 'Css'})[0];
                        },
                        'it should contain the rule from the print stylesheet': function (cssAsset) {
                            assert.equal(cssAsset.parseTree.cssRules.length, 1);
                            assert.equal(cssAsset.parseTree.cssRules[0].style['background-color'], 'maroon');
                        }
                    },
                    'then get the parseTree of the resulting Css asset': {
                        topic: function (assetGraph) {
                            return assetGraph.findAssets({type: 'Css'})[1];
                        },
                        'it should contain the rules from the non-print original Css assets in the right order': function (cssAsset) {
                            assert.equal(cssAsset.parseTree.cssRules.length, 3);
                            assert.equal(cssAsset.parseTree.cssRules[0].style.color, 'teal');
                            assert.equal(cssAsset.parseTree.cssRules[1].style.color, 'tan');
                            assert.equal(cssAsset.parseTree.cssRules[2].style.color, 'blue');
                        }
                    },
                    'then change the url of the Html asset': {
                        topic: function (assetGraph) {
                            assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'subdir/index2.html');
                            return assetGraph;
                        },
                        'the CssAlphaImageLoader relation should be relative to the new Html url': function (assetGraph) {
                            assert.equal(assetGraph.findRelations({type: 'CssAlphaImageLoader'})[0].href, '../foo.png');
                        }
                    }
                }
            }
        }
    }
})['export'](module);
