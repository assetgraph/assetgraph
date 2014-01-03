var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    query = AssetGraph.query;

vows.describe('Bundle stylesheets, oneBundlePerIncludingAsset strategy').addBatch({
    'After loading a test case with 1 Html, 2 stylesheets, and 3 images': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/singleHtml'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph contains 6 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 6);
        },
        'the graph contains 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph contains 3 Png assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 3);
        },
        'the graph contains 2 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 2);
        },
        'the graph contains 2 HtmlStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 2);
        },
        'the graph contains 4 CssImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 4);
        },
        'then bundling the HtmlStyles': {
            topic: function (assetGraph) {
                assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'}).run(this.callback);
            },
            'the number of HtmlStyles should be down to one': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 1);
            },
            'there should be a single Css': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
            },
            'the bundle should have a _lastKnownByteLength property': function (assetGraph) {
                assert.isNumber(assetGraph.findAssets({type: 'Css'})[0]._lastKnownByteLength);
            },
            'all CssImage relations should be attached to the bundle': function (assetGraph) {
                var cssBackgroundImages = assetGraph.findRelations({type: 'CssImage'}),
                    bundle = assetGraph.findAssets({type: 'Css'})[0];
                assert.equal(cssBackgroundImages.length, 4);
                cssBackgroundImages.forEach(function (cssBackgroundImage) {
                    assert.equal(cssBackgroundImage.from.id, bundle.id);
                });
            }
        }
    },
    'After loading a test case with two Html assets that relate to some of the same Css assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/twoHtmls'})
                .loadAssets('1.html', '2.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph should contain 5 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 5);
        },
        'then bundling the HtmlStyle relations': {
            topic: function (assetGraph) {
                assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'}).run(this.callback);
            },
            'the graph should contain 2 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 2);
            },
            'the bundle attached to 1.html should consist of the rules from {a,b,c,d,e}.css in the right order': function (assetGraph) {
                var cssRules = assetGraph.findAssets({type: 'Css', incoming: {from: {url: /\/1\.html$/}}})[0].parseTree.cssRules;
                assert.equal(cssRules.length, 5);
                assert.equal(cssRules[0].style.color, 'azure');
                assert.equal(cssRules[1].style.color, 'beige');
                assert.equal(cssRules[2].style.color, 'crimson');
                assert.equal(cssRules[3].style.color, 'deeppink');
                assert.equal(cssRules[4].style.color, '#eeeee0');
            },
            'the bundle attached to 2.html should consist of the rules from {e,b,c}.css in the right order': function (assetGraph) {
                var cssRules = assetGraph.findAssets({type: 'Css', incoming: {from: {url: /\/2\.html$/}}})[0].parseTree.cssRules;
                assert.equal(cssRules.length, 3);
                assert.equal(cssRules[0].style.color, '#eeeee0');
                assert.equal(cssRules[1].style.color, 'beige');
                assert.equal(cssRules[2].style.color, 'crimson');
            }
        }
    },
    'After loading a test case with 5 HtmlStyles in a Html asset, two of which are in a conditional comment': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/conditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 HtmlStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 5);
        },
        'the graph should contain 2 HtmlConditionalComment relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 2);
        },
        'then bundling the HtmlStyle relations': {
            topic: function (assetGraph) {
                assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'}).run(this.callback);
            },
            'the graph should contain 3 HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 3);
            },
            'index.html should have 2 outgoing HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'}).length, 2);
            },
            'the first outgoing HtmlStyle relation of the Html asset should be a.css and b.css bundled': function (assetGraph) {
                var cssRules = assetGraph.findRelations({from: {url: /\/index\.html$/}})[0].to.parseTree.cssRules;
                assert.equal(cssRules.length, 2);
                assert.equal(cssRules[0].style.getPropertyValue('color'), '#aaaaaa');
                assert.equal(cssRules[1].style.getPropertyValue('color'), '#bbbbbb');
            },
            'the second outgoing HtmlStyle relation of the Html asset should be the original e.css': function (assetGraph) {
                var cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].to;
                assert.matches(cssAsset.url, /\/e\.css$/);
                assert.equal(cssAsset.parseTree.cssRules.length, 1);
                assert.equal(cssAsset.parseTree.cssRules[0].style.getPropertyValue('color'), '#eeeeee');
            },
            'the second conditional comment should have one outgoing HtmlStyle relation consisting of the rules from c.css and d.css': function (assetGraph) {
                var conditionalCommentBody = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlConditionalComment'})[1].to,
                    htmlStyles = assetGraph.findRelations({from: conditionalCommentBody});
                assert.equal(htmlStyles.length, 1);
                assert.equal(htmlStyles[0].to.parseTree.cssRules.length, 2);
                assert.equal(htmlStyles[0].to.parseTree.cssRules[0].style.getPropertyValue('color'), '#cccccc');
                assert.equal(htmlStyles[0].to.parseTree.cssRules[1].style.getPropertyValue('color'), '#dddddd');
            }
        }
    },
    'After loading a test case with 5 HtmlStyles in a Html asset, two of which are in an inverted conditional comment': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/invertedConditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 HtmlStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 5);
        },
        'the graph should contain 1 HtmlConditionalComment relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 1);
        },
        'then bundling the HtmlStyle relations': {
            topic: function (assetGraph) {
                assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'}).run(this.callback);
            },
            'the graph should contain 3 HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 3);
            },
            'index.html should have 3 outgoing HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'}).length, 3);
            },
            'the first outgoing HtmlStyle relation of the Html asset should be a.css and b.css bundled': function (assetGraph) {
                var cssRules = assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[0].to.parseTree.cssRules;
                assert.equal(cssRules.length, 2);
                assert.equal(cssRules[0].style.getPropertyValue('color'), '#aaaaaa');
                assert.equal(cssRules[1].style.getPropertyValue('color'), '#bbbbbb');
            },
            'the second outgoing HtmlStyle relation of the Html asset should be c.css and d.css bundled': function (assetGraph) {
                var cssRules = assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[1].to.parseTree.cssRules;
                assert.equal(cssRules.length, 2);
                assert.equal(cssRules[0].style.getPropertyValue('color'), '#cccccc');
                assert.equal(cssRules[1].style.getPropertyValue('color'), '#dddddd');
            },
            'the third outgoing HtmlStyle relation of the Html asset should be the original e.css': function (assetGraph) {
                var cssAsset = assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[2].to;
                assert.matches(cssAsset.url, /\/e\.css$/);
                assert.equal(cssAsset.parseTree.cssRules.length, 1);
                assert.equal(cssAsset.parseTree.cssRules[0].style.getPropertyValue('color'), '#eeeeee');
            }
        }
    },
    'After loading test case with stylesheets with different media attributes': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/differentMedia/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph contains 3 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 3);
        },
        'the graph contains 7 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 7);
        },
        'then bundle the HtmlStyle relations': {
            topic: function (assetGraph) {
                assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'}).run(this.callback);
            },
            'the graph should contain 5 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 5);
            },
            'the graph should contain 5 HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 5);
            },
            'the first Html asset should have 4 outgoing HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'}).length, 4);
            },
            'the first HtmlStyle relation should have no media attribute': function (assetGraph) {
                assert.isFalse(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0].node.hasAttribute('media'));
            },
            'the first HtmlStyle relation should point at a Css asset containing the rules from a.css and b.css': function (assetGraph) {
                var htmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0];
                assert.equal(htmlStyle.to.parseTree.cssRules.length, 2);
                assert.equal(htmlStyle.to.parseTree.cssRules[0].style.getPropertyValue('color'), '#aaaaaa');
                assert.equal(htmlStyle.to.parseTree.cssRules[1].style.getPropertyValue('color'), '#bbbbbb');
            },
            'the second HtmlStyle relation should have the correct media attribute': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].node.getAttribute('media'), 'aural and (device-aspect-ratio: 16/9)');
            },
            'the second HtmlStyle relation should point at a Css asset containing the rules from c.css and d.css': function (assetGraph) {
                var htmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1];
                assert.equal(htmlStyle.to.parseTree.cssRules.length, 2);
                assert.equal(htmlStyle.to.parseTree.cssRules[0].style.getPropertyValue('color'), '#cccccc');
                assert.equal(htmlStyle.to.parseTree.cssRules[1].style.getPropertyValue('color'), '#dddddd');
            },
            'the third HtmlStyle relation should have the correct media attribute': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].node.getAttribute('media'), 'screen');
            },
            'the third HtmlStyle relation should point to e.css': function (assetGraph) {
                assert.matches(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].to.url, /\/e\.css$/);
            },
            'the fourth HtmlStyle relation should point to f.css': function (assetGraph) {
                assert.matches(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[3].to.url, /\/f\.css$/);
            }
        }
    },
    'After loading a test case with some scripts that should not be bundled': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/skippedScripts/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph contains 6 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 6);
        },
        'the graph contains 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph contains 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then bundle the HtmlScript relations that do not have a nobundle attribute': {
            topic: function (assetGraph) {
                assetGraph.bundleRelations({type: 'HtmlScript', node: function (node) {return !node.hasAttribute('nobundle');}}, {strategyName: 'oneBundlePerIncludingAsset'}).run(this.callback);
            },
            'the graph contains 4 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 4);
            },
            'the JavaScript assets have the expected contents': function (assetGraph) {
                assert.deepEqual(assetGraph.findRelations({type: 'HtmlScript'}).map(function (htmlScript) {
                    return htmlScript.to.text.replace(/\n/g, '');
                }), [
                    'alert("a.js");',
                    'alert("b.js");alert("c.js");',
                    'alert("d.js");',
                    'alert("e.js");'
                ]);
            }
        }
    },
    'After loading a test case with some scripts with copyright notices, then running bundleRelations': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/copyrightNotices/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .run(this.callback);
        },
        'the bundled JavaScript should contain the copyright notices from both a.js and c.js at the top': function (assetGraph) {
            assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /\/\*! Copyright a \*\/[\s\S]*\/\*! Copyright c \*\//);
        }
    },
    'After loading a test case with 5 HtmlStyles in a Html asset, two of which is in a conditional comment': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/conditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 HtmlStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 5);
        },
        'the graph should contain 2 HtmlConditionalComment relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 2);
        },
        'then bundling the HtmlStyle relations': {
            topic: function (assetGraph) {
                assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'}).run(this.callback);
            },
            'the graph should contain 3 HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 3);
            },
            'index.html should have 2 outgoing HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}}).length, 2);
            },
            'the first outgoing HtmlStyle relation of the Html asset should be a.css and b.css bundled': function (assetGraph) {
                var cssRules = assetGraph.findRelations({from: {url: /\/index\.html$/}})[0].to.parseTree.cssRules;
                assert.equal(cssRules.length, 2);
                assert.equal(cssRules[0].style.getPropertyValue('color'), '#aaaaaa');
                assert.equal(cssRules[1].style.getPropertyValue('color'), '#bbbbbb');
            },
            'the second outgoing HtmlStyle relation of the Html asset should be the original e.css': function (assetGraph) {
                var cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].to;
                assert.matches(cssAsset.url, /\/e\.css$/);
                assert.equal(cssAsset.parseTree.cssRules.length, 1);
                assert.equal(cssAsset.parseTree.cssRules[0].style.getPropertyValue('color'), '#eeeeee');
            },
            'the second conditional comment should have one outgoing HtmlStyle relation consisting of the rules from c.css and d.css': function (assetGraph) {
                var conditionalCommentBody = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlConditionalComment'})[1].to,
                    htmlStyles = assetGraph.findRelations({from: conditionalCommentBody});
                assert.equal(htmlStyles.length, 1);
                assert.equal(htmlStyles[0].to.parseTree.cssRules.length, 2);
                assert.equal(htmlStyles[0].to.parseTree.cssRules[0].style.getPropertyValue('color'), '#cccccc');
                assert.equal(htmlStyles[0].to.parseTree.cssRules[1].style.getPropertyValue('color'), '#dddddd');
            }
        }
    },
    'After loading a test case with an @import in the second stylesheet, then running bundleRelations': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/importRules/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .run(this.callback);
        },
        'the bundled Css should have the @import rules at the top': function (assetGraph) {
            var htmlStyles = cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'});

            assert.equal(htmlStyles.length, 1);
            assert.equal(htmlStyles[0].hrefType, 'relative');

            var cssAsset = htmlStyles[0].to,
                cssRules = cssAsset.parseTree.cssRules;
            assert.equal(cssRules.length, 5);
            assert.equal(cssRules[0].href, 'imported.css');
            assert.equal(cssRules[1].href, 'otherImported.css');
            assert.equal(cssRules[2].style.getPropertyValue('color'), 'red');
            assert.equal(cssRules[3].style.getPropertyValue('color'), 'blue');
            assert.equal(cssRules[4].style.getPropertyValue('color'), 'yellow');
        }
    },
    'After loading a test case with two stylesheets, one of which is referred to with a root-relative url, then running the bundleRelations transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/rootRelative/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .run(this.callback);
        },
        'the relation pointing at the bundled asset should have an hrefType of "rootRelative"': function (assetGraph) {
            var htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'});
            assert.equal(htmlStyles.length, 1);
            assert.equal(htmlStyles[0].hrefType, 'rootRelative');
        }
    },
    'After loading a test case with script tags interrupted by an external script inclusion': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRelations/scriptExternal/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: {href: query.not(/^https?:/)}
                })
                .bundleRelations(
                    {
                        type: 'HtmlScript',
                        to: {
                            type: 'JavaScript',
                            isLoaded: true
                        }
                    }, {
                        strategyName: 'oneBundlePerIncludingAsset'
                    }
                )
                .run(this.callback);
        },
        'There should be 3 HtmlScript relations in the graph': function (assetGraph) {
            var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'}, true);
            assert.equal(htmlScripts.length, 3);
        },
        'The first HtmlScript Relation should be local': function (assetGraph) {
            var htmlScript = assetGraph.findRelations({type: 'HtmlScript'}, true)[0];
            assert.notEqual((htmlScript.href || '').substr(0, 4), 'http');
        },
        'The second HtmlScript Relation should be external': function (assetGraph) {
            var htmlScript = assetGraph.findRelations({type: 'HtmlScript'}, true)[1];
            assert.equal(htmlScript.href.substr(0, 4), 'http');
        },
        'The third HtmlScript Relation should be local': function (assetGraph) {
            var htmlScript = assetGraph.findRelations({type: 'HtmlScript'}, true)[2];
            assert.notEqual((htmlScript.href || '').substr(0, 4), 'http');

        }
    }
})['export'](module);
