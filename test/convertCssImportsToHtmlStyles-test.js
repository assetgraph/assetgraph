var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('Converting Css @import rules to <link rel="stylesheet">').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/convertCssImportsToHtmlStyles/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Png');
        },
        'the graph should contain 4 Css assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Css', 4);
        },
        'the graph should contain 3 CssImport relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'CssImport', 3);
        },
        'the graph should contain 1 root-relative CssImport relations': function (assetGraph) {
            expect(assetGraph, 'to contain relation', {type: 'CssImport', hrefType: 'rootRelative'});
        },
        'then run the convertCssImportsToHtmlStyles transform': {
            topic: function (assetGraph) {
                assetGraph.convertCssImportsToHtmlStyles({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 4 Css assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 4);
            },
            'the graph should contain 4 HtmlStyle relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 4);
            },
            'the graph should contain one root-relative HtmlStyle relation': function (assetGraph) {
                expect(assetGraph, 'to contain relation', {type: 'HtmlStyle', hrefType: 'rootRelative'});
            },
            'the graph should contain no CssImport relations': function (assetGraph) {
                expect(assetGraph, 'to contain no relations', {type: 'CssImport'});
            },
            'the HtmlStyle pointing at foo2.css should have media="print"': function (assetGraph) {
                expect(assetGraph.findRelations({type: 'HtmlStyle', to: {url: /\/foo2\.css$/}})[0].node.getAttribute('media'), 'to equal', 'print');
            },
            'then get the Html asset as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Html'})[0].text;
                },
                'the <link rel="stylesheet"> tags should be in the right order': function (text) {
                    expect(text.match(/href=\"([^\'\"]+)\"/g), 'to equal',
                                     ['href="foo2.css"', 'href="foo.css"', 'href="/bar.css"']);
                },
                'then run the bundleRelations transform on the HtmlStyles': {
                    topic: function (_, assetGraph) {
                        assetGraph.bundleRelations({type: 'HtmlStyle'}).run(this.callback);
                    },
                    'there should be 2 HtmlStyle relations': function (assetGraph) {
                        expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
                    },
                    'the first HtmlStyle relation should have media="print"': function (assetGraph) {
                        expect(assetGraph.findRelations({type: 'HtmlStyle'})[0].node.getAttribute('media'), 'to equal', 'print');
                    },
                    'the second HtmlStyle relation should have no media attribute': function (assetGraph) {
                        expect(assetGraph.findRelations({type: 'HtmlStyle'})[1].node.hasAttribute('media'), 'to be false');
                    },
                    'there should be 2 Css assets': function (assetGraph) {
                        expect(assetGraph, 'to contain assets', 'Css', 2);
                    },
                    'then get the parseTree of the first resulting Css asset': {
                        topic: function (assetGraph) {
                            return assetGraph.findAssets({type: 'Css'})[0];
                        },
                        'it should contain the rule from the print stylesheet': function (cssAsset) {
                            expect(cssAsset.parseTree.cssRules, 'to have length', 1);
                            expect(cssAsset.parseTree.cssRules[0].style['background-color'], 'to equal', 'maroon');
                        }
                    },
                    'then get the parseTree of the resulting Css asset': {
                        topic: function (assetGraph) {
                            return assetGraph.findAssets({type: 'Css'})[1];
                        },
                        'it should contain the rules from the non-print original Css assets in the right order': function (cssAsset) {
                            expect(cssAsset.parseTree.cssRules, 'to have length', 3);
                            expect(cssAsset.parseTree.cssRules[0].style.color, 'to equal', 'teal');
                            expect(cssAsset.parseTree.cssRules[1].style.color, 'to equal', 'tan');
                            expect(cssAsset.parseTree.cssRules[2].style.color, 'to equal', 'blue');
                        }
                    },
                    'then change the url of the Html asset': {
                        topic: function (assetGraph) {
                            assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'subdir/index2.html');
                            return assetGraph;
                        },
                        'the CssAlphaImageLoader relation should be relative to the new Html url': function (assetGraph) {
                            expect(assetGraph.findRelations({type: 'CssAlphaImageLoader'})[0].href, 'to equal', '../foo.png');
                        }
                    }
                }
            }
        }
    }
})['export'](module);
