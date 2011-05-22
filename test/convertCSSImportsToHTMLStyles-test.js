var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('Converting CSS @import rules to <link rel="stylesheet">').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/convertCSSImportsToHTMLStyles/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 1 HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
        },
        'the graph should contain 1 PNG asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
        },
        'the graph should contain 4 CSS assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 4);
        },
        'then run the convertCSSImportsToHTMLStyles transform': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.convertCSSImportsToHTMLStyles({type: 'HTML'})).run(this.callback);
            },
            'the graph should contain 4 CSS assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 4);
            },
            'the graph should contain 4 HTMLStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HTMLStyle'}).length, 4);
            },
            'the graph should contain no CSSImport relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CSSImport'}).length, 0);
            },
            'the HTMLStyle pointing at foo2.css should have media="print"': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HTMLStyle', to: {url: /\/foo2\.css$/}})[0].node.getAttribute('media'), 'print');
            },
            'then get the HTML asset as text': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({type: 'HTML'})[0], this.callback);
                },
                'the <link rel="stylesheet"> tags should be in the right order': function (text) {
                    assert.deepEqual(text.match(/href=\"([^\'\"]+)\"/g),
                                     ['href="foo2.css"', 'href="foo.css"', 'href="bar.css"']);
                },
                'then run the bundleAssets transform on the HTMLStyles': {
                    topic: function (_, assetGraph) {
                        assetGraph.queue(transforms.bundleAssets({type: 'CSS', incoming: {type: 'HTMLStyle'}})).run(this.callback);
                    },
                    'there should be a single HTMLStyle relation': function (assetGraph) {
                        assert.equal(assetGraph.findRelations({type: 'HTMLStyle'}).length, 1);
                    },
                    'there should be a single CSS asset': function (assetGraph) {
                        assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 1);
                    },
                    'then get the parseTree of the resulting CSS asset': {
                        topic: function (assetGraph) {
                            assetGraph.findAssets({type: 'CSS'})[0].getParseTree(this.callback);
                        },
                        'it should contain the rules from the original CSS assets in the right order': function (cssStyleSheet) {
                            assert.equal(cssStyleSheet.cssRules.length, 4);
                            assert.equal(cssStyleSheet.cssRules[0].style['background-color'], 'maroon');
                            assert.equal(cssStyleSheet.cssRules[1].style.color, 'teal');
                            assert.equal(cssStyleSheet.cssRules[2].style.color, 'tan');
                            assert.equal(cssStyleSheet.cssRules[3].style.color, 'blue');
                        }
                    },
                    'then change the url of the HTML asset': {
                        topic: function (assetGraph) {
                            assetGraph.setAssetUrl(assetGraph.findAssets({type: 'HTML'})[0], assetGraph.root + 'subdir/index2.html');
                            return assetGraph;
                        },
                        'the CSSAlphaImageLoader relation should be relative to the new HTML url': function (assetGraph) {
                            assert.equal(assetGraph.findRelations({type: 'CSSAlphaImageLoader'})[0]._getRawUrlString(), '../foo.png');
                        }
                    }
                }
            }
        }
    }
})['export'](module);
