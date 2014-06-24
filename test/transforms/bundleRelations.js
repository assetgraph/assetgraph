/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('transforms/bundleRelations', function () {
    describe('with the oneBundlePerIncludingAsset strategy', function (done) {
        it('should bundle two stylesheets', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/singleHtml'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 6);
                    expect(assetGraph, 'to contain asset', 'Html');
                    expect(assetGraph, 'to contain assets', 'Png', 3);
                    expect(assetGraph, 'to contain assets', 'Css', 2);
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
                    expect(assetGraph, 'to contain relations', 'CssImage', 4);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relation', 'HtmlStyle');
                    expect(assetGraph, 'to contain asset', 'Css');
                    expect(assetGraph.findAssets({type: 'Css'})[0]._lastKnownByteLength, 'to be a number');
                    var cssBackgroundImages = assetGraph.findRelations({type: 'CssImage'}),
                        bundle = assetGraph.findAssets({type: 'Css'})[0];
                    expect(cssBackgroundImages, 'to have length', 4);
                    cssBackgroundImages.forEach(function (cssBackgroundImage) {
                        expect(cssBackgroundImage.from.id, 'to equal', bundle.id);
                    });
                })
                .run(done);
        });

        it('should bundle correctly when two Html assets that relate to some of the same Css assets', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/twoHtmls'})
                .loadAssets('1.html', '2.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Html', 2);
                    expect(assetGraph, 'to contain assets', 'Css', 5);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Css', 2);
                    var cssRules = assetGraph.findAssets({type: 'Css', incoming: {from: {url: /\/1\.html$/}}})[0].parseTree.cssRules;
                    expect(cssRules, 'to have length', 5);
                    expect(cssRules[0].style.color, 'to equal', 'azure');
                    expect(cssRules[1].style.color, 'to equal', 'beige');
                    expect(cssRules[2].style.color, 'to equal', 'crimson');
                    expect(cssRules[3].style.color, 'to equal', 'deeppink');
                    expect(cssRules[4].style.color, 'to equal', '#eeeee0');

                    cssRules = assetGraph.findAssets({type: 'Css', incoming: {from: {url: /\/2\.html$/}}})[0].parseTree.cssRules;
                    expect(cssRules, 'to have length', 3);
                    expect(cssRules[0].style.color, 'to equal', '#eeeee0');
                    expect(cssRules[1].style.color, 'to equal', 'beige');
                    expect(cssRules[2].style.color, 'to equal', 'crimson');
                })
                .run(done);
        });

        it('should bundle correctly in the presence of conditional comments', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/conditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
                    expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 2);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
                    expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 2);

                    var cssRules = assetGraph.findRelations({from: {url: /\/index\.html$/}})[0].to.parseTree.cssRules;
                    expect(cssRules, 'to have length', 2);
                    expect(cssRules[0].style.getPropertyValue('color'), 'to equal', '#aaaaaa');
                    expect(cssRules[1].style.getPropertyValue('color'), 'to equal', '#bbbbbb');

                    var cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].to;
                    expect(cssAsset.url, 'to match', /\/e\.css$/);
                    expect(cssAsset.parseTree.cssRules, 'to have length', 1);
                    expect(cssAsset.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#eeeeee');

                    var conditionalCommentBody = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlConditionalComment'})[1].to,
                        htmlStyles = assetGraph.findRelations({from: conditionalCommentBody});
                    expect(htmlStyles, 'to have length', 1);
                    expect(htmlStyles[0].to.parseTree.cssRules, 'to have length', 2);
                    expect(htmlStyles[0].to.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#cccccc');
                    expect(htmlStyles[0].to.parseTree.cssRules[1].style.getPropertyValue('color'), 'to equal', '#dddddd');
                })
                .run(done);
        });

        it('should bundle HtmlStyles correctly when two of them are in an inverted conditional comment', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/invertedConditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
                    expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 1);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
                    expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 3);
                    var cssRules = assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[0].to.parseTree.cssRules;
                    expect(cssRules, 'to have length', 2);
                    expect(cssRules[0].style.getPropertyValue('color'), 'to equal', '#aaaaaa');
                    expect(cssRules[1].style.getPropertyValue('color'), 'to equal', '#bbbbbb');

                    cssRules = assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[1].to.parseTree.cssRules;
                    expect(cssRules, 'to have length', 2);
                    expect(cssRules[0].style.getPropertyValue('color'), 'to equal', '#cccccc');
                    expect(cssRules[1].style.getPropertyValue('color'), 'to equal', '#dddddd');

                    var cssAsset = assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[2].to;
                    expect(cssAsset.url, 'to match', /\/e\.css$/);
                    expect(cssAsset.parseTree.cssRules, 'to have length', 1);
                    expect(cssAsset.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#eeeeee');
                })
                .run(done);
        });

        it('should not bundle stylesheets with different media attributes', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/differentMedia/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Html', 3);
                    expect(assetGraph, 'to contain assets', 'Css', 7);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Css', 5);
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
                    expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 4);
                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0].node.hasAttribute('media'), 'not to be truthy');

                    var htmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0];
                    expect(htmlStyle.to.parseTree.cssRules, 'to have length', 2);
                    expect(htmlStyle.to.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#aaaaaa');
                    expect(htmlStyle.to.parseTree.cssRules[1].style.getPropertyValue('color'), 'to equal', '#bbbbbb');
                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].node.getAttribute('media'), 'to equal', 'aural and (device-aspect-ratio: 16/9)');

                    htmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1];
                    expect(htmlStyle.to.parseTree.cssRules, 'to have length', 2);
                    expect(htmlStyle.to.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#cccccc');
                    expect(htmlStyle.to.parseTree.cssRules[1].style.getPropertyValue('color'), 'to equal', '#dddddd');
                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].node.getAttribute('media'), 'to equal', 'screen');
                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].to.url, 'to match', /\/e\.css$/);
                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[3].to.url, 'to match', /\/f\.css$/);
                })
                .run(done);
        });

        it('should not bundle scripts with additional attributes', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/skippedScripts/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 6);
                    expect(assetGraph, 'to contain asset', 'Html');
                    expect(assetGraph, 'to contain assets', 'JavaScript', 5);
                })
                .bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                    expect(assetGraph.findRelations({type: 'HtmlScript'}).map(function (htmlScript) {
                        return htmlScript.to.text.replace(/\n/g, '');
                    }), 'to equal', [
                        'alert("a.js");',
                        'alert("b.js");alert("c.js");',
                        'alert("d.js");',
                        'alert("e.js");'
                    ]);
                })
                .run(done);
        });

        it('treat defer="defer" and async="async" as bundle discriminators and treat additional attributes like "nobundle"', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/additionalHtmlScriptAttributes'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 12);
                    expect(assetGraph, 'to contain asset', 'Html');
                    expect(assetGraph, 'to contain assets', 'JavaScript', 11);
                    expect(assetGraph, 'to contain relations', 'HtmlScript', 11);
                })
                .bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlScript', 6);
                    var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                    expect(htmlScripts[0].to.text, 'to equal', 'alert("a");alert("b");alert("c");');
                    expect(htmlScripts[1].node.getAttribute('data-foo'), 'to equal', 'bar');
                    expect(htmlScripts[1].to.text, 'to equal', 'alert("d");');
                    expect(htmlScripts[2].to.text, 'to equal', 'alert("e");');
                    expect(htmlScripts[3].to.text, 'to equal', 'alert("f");alert("g");');
                    expect(htmlScripts[4].to.text, 'to equal', 'alert("h");alert("i");');
                    expect(htmlScripts[5].to.text, 'to equal', 'alert("j");alert("k");');
                })
                .run(done);
        });

        it('should gather all the copyright notices and put them at the top of the bundle', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/copyrightNotices/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text,'to match', /\/\*! Copyright a \*\/[\s\S]*\/\*! Copyright c \*\//);
                })
                .run(done);
        });

        it('should not bundle stylesheets with additional attributes on the tag', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/additionalHtmlStyleAttributes'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 10);
                    expect(assetGraph, 'to contain asset', 'Html');
                    expect(assetGraph, 'to contain assets', 'Css', 9);
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 9);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
                    var htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'});
                    expect(htmlStyles[0].to.text, 'to equal', 'body{color:#000}body{color:#111}body{color:#222}');
                    expect(htmlStyles[1].node.getAttribute('data-foo'), 'to equal', 'bar');
                    expect(htmlStyles[1].to.text, 'to equal', 'body {color: #333;}');
                    expect(htmlStyles[2].to.text, 'to equal', 'body {color: #444;}');
                    expect(htmlStyles[3].node.getAttribute('media'), 'to equal', 'screen');
                    expect(htmlStyles[3].to.text, 'to equal', 'body{color:#555}body{color:#666}');
                    expect(htmlStyles[4].node.getAttribute('media'), 'to equal', 'projection');
                    expect(htmlStyles[4].to.text, 'to equal', 'body{color:#777}body{color:#888}');
                })
                .run(done);
        });

        it('should handle 5 HtmlStyles in a Html asset, two of which are in a conditional comment', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/conditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
                    expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 2);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
                    expect(assetGraph, 'to contain relations', {type: 'HtmlStyle', from: {url: /\/index\.html$/}}, 2);
                    var cssRules = assetGraph.findRelations({from: {url: /\/index\.html$/}})[0].to.parseTree.cssRules;
                    expect(cssRules, 'to have length', 2);
                    expect(cssRules[0].style.getPropertyValue('color'), 'to equal', '#aaaaaa');
                    expect(cssRules[1].style.getPropertyValue('color'), 'to equal', '#bbbbbb');

                    var cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].to;
                    expect(cssAsset.url, 'to match', /\/e\.css$/);
                    expect(cssAsset.parseTree.cssRules, 'to have length', 1);
                    expect(cssAsset.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#eeeeee');

                    var conditionalCommentBody = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlConditionalComment'})[1].to,
                        htmlStyles = assetGraph.findRelations({from: conditionalCommentBody});
                    expect(htmlStyles, 'to have length', 1);
                    expect(htmlStyles[0].to.parseTree.cssRules, 'to have length', 2);
                    expect(htmlStyles[0].to.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#cccccc');
                    expect(htmlStyles[0].to.parseTree.cssRules[1].style.getPropertyValue('color'), 'to equal', '#dddddd');
                })
                .run(done);
        });

        it('should handle an @import in a second stylesheet', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/importRules/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    var htmlStyles = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'});

                    expect(htmlStyles, 'to have length', 1);
                    expect(htmlStyles[0].hrefType, 'to equal', 'relative');

                    var cssAsset = htmlStyles[0].to,
                        cssRules = cssAsset.parseTree.cssRules;
                    expect(cssRules, 'to have length', 5);
                    expect(cssRules[0].href, 'to equal', 'imported.css');
                    expect(cssRules[1].href, 'to equal', 'otherImported.css');
                    expect(cssRules[2].style.getPropertyValue('color'), 'to equal', 'red');
                    expect(cssRules[3].style.getPropertyValue('color'), 'to equal', 'blue');
                    expect(cssRules[4].style.getPropertyValue('color'), 'to equal', 'yellow');
                })
                .run(done);
        });

        it('should handle multiple stylesheets, one of which is referred to with a root-relative url', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/rootRelative/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    var htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'});
                    expect(htmlStyles, 'to have length', 1);
                    expect(htmlStyles[0].hrefType, 'to equal', 'rootRelative');
                })
                .run(done);
        });

        it('should handle script tags interrupted by an external script inclusion', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/scriptExternal/'})
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
                .queue(function (assetGraph) {
                    var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'}, true);
                    expect(htmlScripts, 'to have length', 3);

                    expect((htmlScripts[0].href || '').substr(0, 4), 'not to equal', 'http');

                    expect(htmlScripts[1].href.substr(0, 4), 'to equal', 'http');

                    expect((htmlScripts[2].href || '').substr(0, 4), 'not to equal', 'http');
                })
                .run(done);
        });

        it('should handle script tags interrupted by an unloaded script', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/unloadedScript/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    assetGraph.findAssets({fileName: 'b.js'})[0].unload();
                })
                .bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                })
                .run(done);
        });

        it('should handle script tags in both <head> and <body>', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/scriptsInHead/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({
                    type: 'HtmlScript',
                    to: {
                        type: 'JavaScript',
                        isLoaded: true
                    }
                }, {
                    strategyName: 'oneBundlePerIncludingAsset'
                })
                .queue(function (assetGraph) {
                    var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'}, true);
                    expect(htmlScripts, 'to have length', 2);
                    expect(htmlScripts[0].node.parentNode.tagName, 'to equal', 'HEAD');
                    expect(htmlScripts[1].node.parentNode.tagName, 'to equal', 'BODY');
                })
                .run(done);
        });

        it('should handle script tags in alternating strict mode', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/strictScripts/'})
                .on('info', function (e) {
                    if (!this._infos) {
                        this._infos = [];
                    }
                    this._infos.push(e);
                })
                .loadAssets('index.html')
                .populate()
                .bundleRelations({
                    type: 'HtmlScript',
                    to: {
                        type: 'JavaScript',
                        isLoaded: true
                    }
                }, {
                    strategyName: 'oneBundlePerIncludingAsset'
                })
                .queue(function (assetGraph) {
                    var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'}, true);
                    expect(htmlScripts, 'to have length', 4);
                    expect(assetGraph._infos, 'to have length', 2);
                })
                .run(done);
        });

        it('should handle named bundles', function (done) {
            new AssetGraph({ root: __dirname + '/../../testdata/transforms/bundleRelations/namedBundles/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({
                    type: 'HtmlScript',
                    to: {
                        type: 'JavaScript',
                        isLoaded: true
                    }
                }, {
                    strategyName: 'oneBundlePerIncludingAsset'
                })
                .queue(function (assetGraph) {
                    var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'}, true);
                    expect(htmlScripts, 'to have length', 2);
                })
                .run(done);
        });
    });

    describe('with the sharedBundles strategy', function () {
        it('should handle a test case with 1 Html, 2 stylesheets, and 3 images', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/singleHtml'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 6);
                    expect(assetGraph, 'to contain asset', 'Html');
                    expect(assetGraph, 'to contain assets', 'Png', 3);
                    expect(assetGraph, 'to contain assets', 'Css', 2);
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
                    expect(assetGraph, 'to contain relations', 'CssImage', 4);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relation', 'HtmlStyle');
                    expect(assetGraph, 'to contain asset', 'Css');

                    var cssBackgroundImages = assetGraph.findRelations({type: 'CssImage'}),
                        bundle = assetGraph.findAssets({type: 'Css'})[0];
                    expect(cssBackgroundImages, 'to have length', 4);
                    cssBackgroundImages.forEach(function (cssBackgroundImage) {
                        expect(cssBackgroundImage.from.id, 'to equal', bundle.id);
                    });
                })
                .run(done);
        });

        it('should handle a test case with two Html assets that relate to some of the same Css assets', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/twoHtmls'})
                .loadAssets('1.html', '2.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Html', 2);
                    expect(assetGraph, 'to contain assets', 'Css', 5);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Css', 4);
                    expect(assetGraph, 'to contain asset', {url: /\/a\.css$/});
                    expect(assetGraph, 'to contain asset', {url: /\/d\.css$/});

                    expect(assetGraph, 'to contain asset', {url: /\/e\.css$/});

                    expect(assetGraph, 'to contain no assets', {url: /\/[bc]\.css$/});

                    var cssAssets = assetGraph.findAssets({type: 'Css'}),
                        cssRules = cssAssets[cssAssets.length - 1].parseTree.cssRules;
                    expect(cssRules, 'to have length', 2);
                    expect(cssRules[0].style.color, 'to equal', 'beige');
                    expect(cssRules[1].style.color, 'to equal', 'crimson');
                })
                .run(done);
        });

        it('should handle a test case with 5 HtmlStyles in a Html asset, two of which is in a conditional comment', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/conditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
                    expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 2);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'})
                .queue(function (assetGraph) {

                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);

                    expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 2);

                    var cssRules = assetGraph.findRelations({from: {url: /\/index\.html$/}})[0].to.parseTree.cssRules;
                    expect(cssRules, 'to have length', 2);
                    expect(cssRules[0].style.getPropertyValue('color'), 'to equal', '#aaaaaa');
                    expect(cssRules[1].style.getPropertyValue('color'), 'to equal', '#bbbbbb');

                    var cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].to;
                    expect(cssAsset.url, 'to match', /\/e\.css$/);
                    expect(cssAsset.parseTree.cssRules, 'to have length', 1);
                    expect(cssAsset.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#eeeeee');

                    var conditionalCommentBody = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlConditionalComment'})[1].to,
                        htmlStyles = assetGraph.findRelations({from: conditionalCommentBody});
                    expect(htmlStyles, 'to have length', 1);
                    expect(htmlStyles[0].to.parseTree.cssRules, 'to have length', 2);
                    expect(htmlStyles[0].to.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#cccccc');
                    expect(htmlStyles[0].to.parseTree.cssRules[1].style.getPropertyValue('color'), 'to equal', '#dddddd');
                })
                .run(done);
        });

        it('should handle a test case with stylesheets with different media attributes', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/differentMedia/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Html', 3);
                    expect(assetGraph, 'to contain assets', 'Css', 7);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Css', 5);
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
                    expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 4);

                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0].node.hasAttribute('media'), 'to be falsy');

                    var firstHtmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0];
                    expect(firstHtmlStyle.to.parseTree.cssRules, 'to have length', 2);
                    expect(firstHtmlStyle.to.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#aaaaaa');
                    expect(firstHtmlStyle.to.parseTree.cssRules[1].style.getPropertyValue('color'), 'to equal', '#bbbbbb');

                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].node.getAttribute('media'), 'to equal', 'aural and (device-aspect-ratio: 16/9)');

                    var secondHtmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1];

                    expect(secondHtmlStyle.to.parseTree.cssRules, 'to have length', 2);
                    expect(secondHtmlStyle.to.parseTree.cssRules[0].style.getPropertyValue('color'), 'to equal', '#cccccc');
                    expect(secondHtmlStyle.to.parseTree.cssRules[1].style.getPropertyValue('color'), 'to equal', '#dddddd');

                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].node.getAttribute('media'), 'to equal', 'screen');

                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].to.url, 'to match', /\/e\.css$/);

                    expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[3].to.url, 'to match', /\/f\.css$/);
                })
                .run(done);
        });

        it('should handle a test with two pages, each containing an external HtmlStyle followed by an inline one', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/externalHtmlStyleFollowedByInlineStyle/'})
                .loadAssets('*.html')
                .populate()
                .bundleRelations({type: ['HtmlStyle']}, {strategyName: 'sharedBundles'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Css', 3);
                    expect(assetGraph, 'to contain asset', {type: 'Css', isInline: false, url: /\/a\.css$/});
                    expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true}, 2);
                    expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true, text: '.body{foo:bar;}'}, 2);
                })
                .run(done);
        });

        it('should handle a duplicated script', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/duplicateScript/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: ['HtmlScript'], to: {isLoaded: true}}, {strategyName: 'sharedBundles'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'JavaScript', 2);

                    expect(assetGraph, 'to contain asset', {type: 'JavaScript', isInline: false, url: /\/a\.js$/});

                    expect(assetGraph, 'to contain asset', {type: 'JavaScript', isInline: false, url: /\/b\.js$/});

                    expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

                    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                    expect(assetGraph, 'to contain asset', {type: 'JavaScript', text: 'alert("a");\n'});
                    expect(assetGraph, 'to contain asset', {type: 'JavaScript', text: 'alert("b");\n'});
                })
                .run(done);
        });

        it('treat defer="defer" and async="async" as bundle discriminators and treat additional attributes like "nobundle"', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/additionalHtmlScriptAttributes'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 12);
                    expect(assetGraph, 'to contain asset', 'Html');
                    expect(assetGraph, 'to contain assets', 'JavaScript', 11);
                    expect(assetGraph, 'to contain relations', 'HtmlScript', 11);
                })
                .bundleRelations({type: 'HtmlScript'}, {strategyName: 'sharedBundles'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlScript', 6);
                    var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                    expect(htmlScripts[0].to.text, 'to equal', 'alert("a");alert("b");alert("c");');
                    expect(htmlScripts[1].node.getAttribute('data-foo'), 'to equal', 'bar');
                    expect(htmlScripts[1].to.text, 'to equal', 'alert("d");');
                    expect(htmlScripts[2].to.text, 'to equal', 'alert("e");');
                    expect(htmlScripts[3].to.text, 'to equal', 'alert("f");alert("g");');
                    expect(htmlScripts[4].to.text, 'to equal', 'alert("h");alert("i");');
                    expect(htmlScripts[5].to.text, 'to equal', 'alert("j");alert("k");');
                })
                .run(done);
        });

        it('should not bundle stylesheets with additional attributes on the tag', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/additionalHtmlStyleAttributes'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 10);
                    expect(assetGraph, 'to contain asset', 'Html');
                    expect(assetGraph, 'to contain assets', 'Css', 9);
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 9);
                })
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
                    var htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'});
                    expect(htmlStyles[0].to.text, 'to equal', 'body{color:#000}body{color:#111}body{color:#222}');
                    expect(htmlStyles[1].node.getAttribute('data-foo'), 'to equal', 'bar');
                    expect(htmlStyles[1].to.text, 'to equal', 'body {color: #333;}');
                    expect(htmlStyles[2].to.text, 'to equal', 'body {color: #444;}');
                    expect(htmlStyles[3].node.getAttribute('media'), 'to equal', 'screen');
                    expect(htmlStyles[3].to.text, 'to equal', 'body{color:#555}body{color:#666}');
                    expect(htmlStyles[4].node.getAttribute('media'), 'to equal', 'projection');
                    expect(htmlStyles[4].to.text, 'to equal', 'body{color:#777}body{color:#888}');
                })
                .run(done);
        });
    });
});
