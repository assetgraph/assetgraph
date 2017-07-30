/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');
const AssetGraph = require('../../lib/AssetGraph');
const query = AssetGraph.query;

// Helper for extracting all values of a specific property from a postcss rule
function getPropertyValues(container, propertyName) {
    return container.nodes.filter(function (node) {
        return node.prop === propertyName;
    }).map(function (node) {
        return node.value;
    });
}

describe('transforms/bundleRelations', function () {
    describe('with the oneBundlePerIncludingAsset strategy', function () {
        it('should bundle two stylesheets', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/singleHtml'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 6);
            expect(assetGraph, 'to contain asset', 'Html');
            expect(assetGraph, 'to contain assets', 'Png', 3);
            expect(assetGraph, 'to contain assets', 'Css', 2);
            expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
            expect(assetGraph, 'to contain relations', 'CssImage', 4);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain relation', 'HtmlStyle');
            expect(assetGraph, 'to contain asset', 'Css');
            expect(assetGraph.findAssets({type: 'Css'})[0]._lastKnownByteLength, 'to be a number');
            const cssBackgroundImages = assetGraph.findRelations({type: 'CssImage'});
            const bundle = assetGraph.findAssets({type: 'Css'})[0];
            expect(cssBackgroundImages, 'to have length', 4);
            cssBackgroundImages.forEach(function (cssBackgroundImage) {
                expect(cssBackgroundImage.from.id, 'to equal', bundle.id);
            });
        });

        it('should bundle correctly when two Html assets that relate to some of the same Css assets', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/twoHtmls'})
                .loadAssets('1.html', '2.html')
                .populate();

            expect(assetGraph, 'to contain assets', 'Html', 2);
            expect(assetGraph, 'to contain assets', 'Css', 5);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain assets', 'Css', 2);
            let cssRules = assetGraph.findAssets({type: 'Css', incoming: {from: {url: /\/1\.html$/}}})[0].parseTree.nodes;
            expect(cssRules, 'to have length', 5);
            expect(getPropertyValues(cssRules[0], 'color'), 'to equal', [ 'azure' ]);
            expect(getPropertyValues(cssRules[1], 'color'), 'to equal', [ 'beige' ]);
            expect(getPropertyValues(cssRules[2], 'color'), 'to equal', [ 'crimson' ]);
            expect(getPropertyValues(cssRules[3], 'color'), 'to equal', [ 'deeppink' ]);
            expect(getPropertyValues(cssRules[4], 'color'), 'to equal', [ '#eeeee0' ]);

            cssRules = assetGraph.findAssets({type: 'Css', incoming: {from: {url: /\/2\.html$/}}})[0].parseTree.nodes;
            expect(cssRules, 'to have length', 3);
            expect(getPropertyValues(cssRules[0], 'color'), 'to equal', [ '#eeeee0' ]);
            expect(getPropertyValues(cssRules[1], 'color'), 'to equal', [ 'beige' ]);
            expect(getPropertyValues(cssRules[2], 'color'), 'to equal', [ 'crimson' ]);
        });

        it('should insert a CSS bundle at the point of the first incoming relation', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/insertPoint/'})
                .loadAssets('HtmlStyle.html')
                .populate();

            expect(assetGraph.findAssets({type: 'Html'}), 'to satisfy', [
                {
                    type: 'Html',
                    text: '<style>h1 { color: red; }</style>\n<h1>Hello World</h1>\n<style>p { color: blue; }</style>\n'
                }
            ]);

            await assetGraph
                .bundleRelations({type: 'HtmlStyle'})
                .inlineRelations();

            expect(assetGraph.findAssets({type: 'Html'}), 'to satisfy', [
                {
                    type: 'Html',
                    text: '<style type="text/css">h1 { color: red; }p { color: blue; }</style>\n<h1>Hello World</h1>\n\n'
                }
            ]);
        });

        it('should insert a JS bundle at the point of the last incoming relation', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/insertPoint/'})
                .loadAssets('HtmlScript.html')
                .populate();

            expect(assetGraph.findAssets({type: 'Html'}), 'to satisfy', [
                {
                    type: 'Html',
                    text: '<script>var foo = \'foo\'</script>\n<h1>Hello World</h1>\n<script>var bar = \'bar\'</script>\n'
                }
            ]);

            await assetGraph
                .bundleRelations({type: 'HtmlScript'})
                .inlineRelations();

            expect(assetGraph.findAssets({type: 'Html'}), 'to satisfy', [
                {
                    type: 'Html',
                    text: '\n<h1>Hello World</h1>\n<script>var foo = \'foo\';\nvar bar = \'bar\';</script>\n'
                }
            ]);
        });

        it('should bundle correctly in the presence of conditional comments', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/conditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
            expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 2);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
            expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 2);

            const cssRules = assetGraph.findRelations({from: {url: /\/index\.html$/}})[0].to.parseTree.nodes;
            expect(cssRules, 'to have length', 2);
            expect(getPropertyValues(cssRules[0], 'color'), 'to equal', [ '#aaaaaa' ]);
            expect(getPropertyValues(cssRules[1], 'color'), 'to equal', [ '#bbbbbb' ]);

            const cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].to;
            expect(cssAsset.url, 'to match', /\/e\.css$/);
            expect(cssAsset.parseTree.nodes, 'to have length', 1);
            expect(getPropertyValues(cssAsset.parseTree.nodes[0], 'color'), 'to equal', [ '#eeeeee' ]);

            const conditionalCommentBody = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlConditionalComment'})[1].to;
            const htmlStyles = assetGraph.findRelations({from: conditionalCommentBody});
            expect(htmlStyles, 'to have length', 1);
            expect(htmlStyles[0].to.parseTree.nodes, 'to have length', 2);
            expect(getPropertyValues(htmlStyles[0].to.parseTree.nodes[0], 'color'), 'to equal', [ '#cccccc' ]);
            expect(getPropertyValues(htmlStyles[0].to.parseTree.nodes[1], 'color'), 'to equal', [ '#dddddd' ]);
        });

        it('should bundle HtmlStyles correctly when two of them are in an inverted conditional comment', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/invertedConditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
            expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 1);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
            expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 3);
            let cssRules = assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[0].to.parseTree.nodes;
            expect(cssRules, 'to have length', 2);
            expect(getPropertyValues(cssRules[0], 'color'), 'to equal', [ '#aaaaaa' ]);
            expect(getPropertyValues(cssRules[1], 'color'), 'to equal', [ '#bbbbbb' ]);

            cssRules = assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[1].to.parseTree.nodes;
            expect(cssRules, 'to have length', 2);
            expect(getPropertyValues(cssRules[0], 'color'), 'to equal', [ '#cccccc' ]);
            expect(getPropertyValues(cssRules[1], 'color'), 'to equal', [ '#dddddd' ]);

            const cssAsset = assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}})[2].to;
            expect(cssAsset.url, 'to match', /\/e\.css$/);
            expect(cssAsset.parseTree.nodes, 'to have length', 1);
            expect(getPropertyValues(cssAsset.parseTree.nodes[0], 'color'), 'to equal', [ '#eeeeee' ]);
        });

        it('should not bundle stylesheets with different media attributes', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/differentMedia/'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 'Html', 3);
            expect(assetGraph, 'to contain assets', 'Css', 7);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain assets', 'Css', 5);
            expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
            expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 4);
            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0].node.hasAttribute('media'), 'not to be truthy');

            let htmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0];
            expect(htmlStyle.to.parseTree.nodes, 'to have length', 2);
            expect(getPropertyValues(htmlStyle.to.parseTree.nodes[0], 'color'), 'to equal', [ '#aaaaaa' ]);
            expect(getPropertyValues(htmlStyle.to.parseTree.nodes[1], 'color'), 'to equal', [ '#bbbbbb' ]);
            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].node.getAttribute('media'), 'to equal', 'aural and (device-aspect-ratio: 16/9)');

            htmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1];
            expect(htmlStyle.to.parseTree.nodes, 'to have length', 2);
            expect(getPropertyValues(htmlStyle.to.parseTree.nodes[0], 'color'), 'to equal', [ '#cccccc' ]);
            expect(getPropertyValues(htmlStyle.to.parseTree.nodes[1], 'color'), 'to equal', [ '#dddddd' ]);
            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].node.getAttribute('media'), 'to equal', 'screen');
            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].to.url, 'to match', /\/e\.css$/);
            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[3].to.url, 'to match', /\/f\.css$/);
        });

        it('should not bundle scripts with additional attributes', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/skippedScripts/'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 6);
            expect(assetGraph, 'to contain asset', 'Html');
            expect(assetGraph, 'to contain assets', 'JavaScript', 5);

            await assetGraph.bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain assets', 'JavaScript', 4);
            expect(assetGraph.findRelations({type: 'HtmlScript'}).map(function (htmlScript) {
                return htmlScript.to.text.replace(/\n/g, '');
            }), 'to equal', [
                'alert(\'a.js\');',
                'alert(\'b.js\');alert(\'c.js\');',
                'alert(\'d.js\');',
                'alert(\'e.js\');'
            ]);
        });

        it('allows bundling scripts with different data-assetgraph-conditions attributes, but merges the values', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/conditions/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'})
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain assets', 'JavaScript', 1);
            expect(assetGraph, 'to contain assets', 'Css', 1);
            expect(assetGraph, 'to contain relation', 'HtmlStyle');
            expect(assetGraph, 'to contain relation', 'HtmlScript');
            expect(assetGraph.findRelations({type: 'HtmlStyle'})[0].node.getAttribute('data-assetgraph-conditions'), 'to equal', "weather: ['sunny', 'rainy'], mood: ['happy', 'sad'], food: 'ham'");
            expect(assetGraph.findRelations({type: 'HtmlScript'})[0].node.getAttribute('data-assetgraph-conditions'), 'to equal', "weather: ['sunny', 'rainy'], mood: ['happy', 'sad'], food: 'ham'");
        });

        it('should treat defer="defer" and async="async" as bundle discriminators and treat additional attributes like "nobundle"', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/additionalHtmlScriptAttributes'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 12);
            expect(assetGraph, 'to contain asset', 'Html');
            expect(assetGraph, 'to contain assets', 'JavaScript', 11);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 11);

            await assetGraph.bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain relations', 'HtmlScript', 6);
            const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
            expect(htmlScripts[0].to.text, 'to equal', 'alert(\'a\');\nalert(\'b\');\nalert(\'c\');');
            expect(htmlScripts[1].node.getAttribute('data-foo'), 'to equal', 'bar');
            expect(htmlScripts[1].to.text, 'to equal', 'alert(\'d\');');
            expect(htmlScripts[2].to.text, 'to equal', 'alert(\'e\');');
            expect(htmlScripts[3].to.text, 'to equal', 'alert(\'f\');\nalert(\'g\');');
            expect(htmlScripts[4].to.text, 'to equal', 'alert(\'h\');\nalert(\'i\');');
            expect(htmlScripts[5].to.text, 'to equal', 'alert(\'j\');\nalert(\'k\');');
        });

        it('should reinstate async="async" and defer="defer" on the relations to the bundle asset', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/asyncAndDeferredScripts'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph.findAssets({fileName: 'index.html'})[0].text, 'not to contain', 'alert')
                .and('to match', /<script src="[^"]+" async="async">/)
                .and('to match', /<script src="[^"]+" defer="defer">/);
            expect(assetGraph, 'to contain assets', {type: 'JavaScript', isInline: false, text: /alert/}, 2);
        });

        it('should gather all the copyright notices and put them at the top of the bundle', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/copyrightNotices/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /\/\*! Copyright a \*\/[\s\S]*\/\*! Copyright c \*\//);
        });

        it('should not bundle stylesheets with additional attributes on the tag', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/additionalHtmlStyleAttributes'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 10);
            expect(assetGraph, 'to contain asset', 'Html');
            expect(assetGraph, 'to contain assets', 'Css', 9);
            expect(assetGraph, 'to contain relations', 'HtmlStyle', 9);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
            const htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'});
            expect(htmlStyles[0].to.text, 'to equal', 'body {color: #000;}body {color: #111;}body {color: #222;}');
            expect(htmlStyles[1].node.getAttribute('data-foo'), 'to equal', 'bar');
            expect(htmlStyles[1].to.text, 'to equal', 'body {color: #333;}');
            expect(htmlStyles[2].to.text, 'to equal', 'body {color: #444;}');
            expect(htmlStyles[3].node.getAttribute('media'), 'to equal', 'screen');
            expect(htmlStyles[3].to.text, 'to equal', 'body {color: #555;}body {color: #666;}');
            expect(htmlStyles[4].node.getAttribute('media'), 'to equal', 'projection');
            expect(htmlStyles[4].to.text, 'to equal', 'body {color: #777;}body {color: #888;}');
        });

        it('should ignore the nonce attribute when bundling', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/nonceAttribute'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: ['HtmlStyle', 'HtmlScript']}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 1);
            expect(assetGraph.findRelations({type: 'HtmlStyle'})[0].to.text, 'to equal', 'body {color: #000;}body {color: #111;}');

            expect(assetGraph, 'to contain relations', 'HtmlScript', 1);
            expect(assetGraph.findRelations({type: 'HtmlScript'})[0].to.text, 'to equal', "alert('a');\nalert('b');");
        });

        describe('when all nonces of the bundled relations match', function () {
            it('should reattach the nonce value to the bundle relation', async function () {
                const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/matchingNonceAttributes'})
                    .loadAssets('index.html')
                    .populate()
                    .bundleRelations({type: ['HtmlStyle', 'HtmlScript']}, {strategyName: 'oneBundlePerIncludingAsset'});

                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain', 'nonce="foo"');
            });
        });

        describe('when the nonces of the bundled relations mismatch', function () {
            it('should reattach the nonce value to the bundle relation', async function () {
                const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/mismatchingNonceAttributes'})
                    .loadAssets('index.html')
                    .populate()
                    .bundleRelations({type: ['HtmlStyle', 'HtmlScript']}, {strategyName: 'oneBundlePerIncludingAsset'});

                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'not to contain', 'nonce=');
            });
        });

        it('should handle 5 HtmlStyles in a Html asset, two of which are in a conditional comment', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/conditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
            expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 2);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
            expect(assetGraph, 'to contain relations', {type: 'HtmlStyle', from: {url: /\/index\.html$/}}, 2);
            const cssRules = assetGraph.findRelations({from: {url: /\/index\.html$/}})[0].to.parseTree.nodes;
            expect(cssRules, 'to have length', 2);
            expect(getPropertyValues(cssRules[0], 'color'), 'to equal', [ '#aaaaaa' ]);
            expect(getPropertyValues(cssRules[1], 'color'), 'to equal', [ '#bbbbbb' ]);

            const cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].to;
            expect(cssAsset.url, 'to match', /\/e\.css$/);
            expect(cssAsset.parseTree.nodes, 'to have length', 1);
            expect(getPropertyValues(cssAsset.parseTree.nodes[0], 'color'), 'to equal', [ '#eeeeee' ]);

            const conditionalCommentBody = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlConditionalComment'})[1].to;
            const htmlStyles = assetGraph.findRelations({from: conditionalCommentBody});
            expect(htmlStyles, 'to have length', 1);
            expect(htmlStyles[0].to.parseTree.nodes, 'to have length', 2);
            expect(getPropertyValues(htmlStyles[0].to.parseTree.nodes[0], 'color'), 'to equal', [ '#cccccc' ]);
            expect(getPropertyValues(htmlStyles[0].to.parseTree.nodes[1], 'color'), 'to equal', [ '#dddddd' ]);
        });

        it('should handle an @import in a second stylesheet', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/importRules/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            const htmlStyles = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'});

            expect(htmlStyles, 'to have length', 1);
            expect(htmlStyles[0].hrefType, 'to equal', 'relative');

            const cssAsset = htmlStyles[0].to;
            const cssRules = cssAsset.parseTree.nodes;
            expect(cssRules, 'to have length', 5);
            expect(cssRules[0].params, 'to equal', '"imported.css"');
            expect(cssRules[1].params, 'to equal', '"otherImported.css"');
            expect(getPropertyValues(cssRules[2], 'color'), 'to equal', [ 'red' ]);
            expect(getPropertyValues(cssRules[3], 'color'), 'to equal', [ 'blue' ]);
            expect(getPropertyValues(cssRules[4], 'color'), 'to equal', [ 'yellow' ]);
        });

        it('should handle multiple stylesheets, one of which is referred to with a root-relative url', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/rootRelative/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'oneBundlePerIncludingAsset'});

            const htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'});
            expect(htmlStyles, 'to have length', 1);
            expect(htmlStyles[0].hrefType, 'to equal', 'rootRelative');
        });

        it('should handle script tags interrupted by an external script inclusion', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/scriptExternal/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: {href: query.not(/^https?:/)}
                })
                .bundleRelations({
                    type: 'HtmlScript',
                    to: {
                        type: 'JavaScript',
                        isLoaded: true
                    }
                }, {
                    strategyName: 'oneBundlePerIncludingAsset'
                });

            const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'}, true);
            expect(htmlScripts, 'to have length', 3);

            expect((htmlScripts[0].href || '').substr(0, 4), 'not to equal', 'http');

            expect(htmlScripts[1].href.substr(0, 4), 'to equal', 'http');

            expect((htmlScripts[2].href || '').substr(0, 4), 'not to equal', 'http');
        });

        it('should handle script tags interrupted by an unloaded script', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/unloadedScript/'})
                .loadAssets('index.html')
                .populate();

            assetGraph.findAssets({fileName: 'b.js'})[0].unload();

            await assetGraph.bundleRelations({type: 'HtmlScript'}, {strategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain assets', 'JavaScript', 2);
        });

        it('should handle script tags in both <head> and <body>', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/scriptsInHead/'})
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
                });

            const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'}, true);
            expect(htmlScripts, 'to have length', 2);
            expect(htmlScripts[0].node.parentNode.tagName, 'to equal', 'HEAD');
            expect(htmlScripts[1].node.parentNode.tagName, 'to equal', 'BODY');
        });

        it('should handle script tags in alternating strict mode', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/strictScripts/'})
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
                });

            const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'}, true);
            expect(htmlScripts, 'to have length', 4);
            expect(assetGraph._infos, 'to have length', 2);
        });

        it('should handle named bundles', async function () {
            const assetGraph = await new AssetGraph({ root: __dirname + '/../../testdata/transforms/bundleRelations/namedBundles/'})
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
                });

            const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'}, true);
            expect(htmlScripts, 'to have length', 2);
        });

        it('should propagate source map information correctly', async function () {
            const warnSpy = sinon.spy().named('warn');
            const assetGraph = await new AssetGraph({ root: __dirname + '/../../testdata/transforms/bundleRelations/cssSourceMaps/'})
                .on('warn', warnSpy)
                .loadAssets('index.html')
                .populate()
                .applySourceMaps();

            expect(warnSpy, 'to have calls satisfying', () => warnSpy(/^ENOENT.*to\.css/));

            const sourceMaps = assetGraph.findAssets({ type: 'SourceMap' });
            sourceMaps.sort(function (a, b) {
                a = a.parseTree.sources[0];
                b = b.parseTree.sources[0];
                return (a < b) ? -1 : (a > b ? 1 : 0);
            });
            expect(sourceMaps[0].parseTree.sources, 'to equal', [ '/a.less' ]);
            expect(sourceMaps[1].parseTree.sources, 'to equal', [ '/b.less' ]);

            await assetGraph.bundleRelations({
                type: 'HtmlStyle',
                to: {
                    type: 'Css',
                    isLoaded: true
                }
            }, {
                strategyName: 'oneBundlePerIncludingAsset'
            })
                .serializeSourceMaps();

            expect(assetGraph, 'to contain asset', 'SourceMap');
            expect(assetGraph.findAssets({ type: 'SourceMap' })[0].parseTree.sources, 'to equal', [
                assetGraph.root + 'a.less',
                assetGraph.root + 'b.less'
            ]);
        });

        it('should bundle importScripts(...) relations in a web worker', async function () {
            const assetGraph = await new AssetGraph({ root: __dirname + '/../../testdata/transforms/bundleRelations/webWorker/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: 'JavaScriptImportScripts'}, {trategyName: 'oneBundlePerIncludingAsset'});

            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain relation', 'JavaScriptImportScripts');
            expect(
                assetGraph.findRelations({type: 'JavaScriptImportScripts'})[0].to.text,
                'to equal',
                "console.log('foo');\nconsole.log('bar');\nconsole.log('quux');"
            );
            expect(assetGraph.findAssets({fileName: 'worker.js'})[0].text, 'to match', /^importScripts\('bundle-\d+\.js'\);$/);
        });
    });

    describe('with the sharedBundles strategy', function () {
        it('should handle a test case with 1 Html, 2 stylesheets, and 3 images', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/singleHtml'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 6);
            expect(assetGraph, 'to contain asset', 'Html');
            expect(assetGraph, 'to contain assets', 'Png', 3);
            expect(assetGraph, 'to contain assets', 'Css', 2);
            expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
            expect(assetGraph, 'to contain relations', 'CssImage', 4);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'});

            expect(assetGraph, 'to contain relation', 'HtmlStyle');
            expect(assetGraph, 'to contain asset', 'Css');

            const cssBackgroundImages = assetGraph.findRelations({type: 'CssImage'});
            const bundle = assetGraph.findAssets({type: 'Css'})[0];
            expect(cssBackgroundImages, 'to have length', 4);
            cssBackgroundImages.forEach(function (cssBackgroundImage) {
                expect(cssBackgroundImage.from.id, 'to equal', bundle.id);
            });
        });

        it('should handle a test case with two Html assets that relate to some of the same Css assets', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/twoHtmls'})
                .loadAssets('1.html', '2.html')
                .populate();

            expect(assetGraph, 'to contain assets', 'Html', 2);
            expect(assetGraph, 'to contain assets', 'Css', 5);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'});

            expect(assetGraph, 'to contain assets', 'Css', 4);
            expect(assetGraph, 'to contain asset', {url: /\/a\.css$/});
            expect(assetGraph, 'to contain asset', {url: /\/d\.css$/});

            expect(assetGraph, 'to contain asset', {url: /\/e\.css$/});

            expect(assetGraph, 'to contain no assets', {url: /\/[bc]\.css$/});

            const cssAssets = assetGraph.findAssets({type: 'Css'});
            const cssRules = cssAssets[cssAssets.length - 1].parseTree.nodes;
            expect(cssRules, 'to have length', 2);
            expect(getPropertyValues(cssRules[0], 'color'), 'to equal', [ 'beige' ]);
            expect(getPropertyValues(cssRules[1], 'color'), 'to equal', [ 'crimson' ]);
        });

        it('should handle a test case with 5 HtmlStyles in a Html asset, two of which is in a conditional comment', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/conditionalCommentInTheMiddle/'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
            expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 2);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'});

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);

            expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 2);

            const cssRules = assetGraph.findRelations({from: {url: /\/index\.html$/}})[0].to.parseTree.nodes;
            expect(cssRules, 'to have length', 2);
            expect(getPropertyValues(cssRules[0], 'color'), 'to equal', [ '#aaaaaa' ]);
            expect(getPropertyValues(cssRules[1], 'color'), 'to equal', [ '#bbbbbb' ]);

            const cssAsset = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].to;
            expect(cssAsset.url, 'to match', /\/e\.css$/);
            expect(cssAsset.parseTree.nodes, 'to have length', 1);
            expect(getPropertyValues(cssAsset.parseTree.nodes[0], 'color'), 'to equal', [ '#eeeeee' ]);

            const conditionalCommentBody = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlConditionalComment'})[1].to;
            const htmlStyles = assetGraph.findRelations({from: conditionalCommentBody});
            expect(htmlStyles, 'to have length', 1);
            expect(htmlStyles[0].to.parseTree.nodes, 'to have length', 2);
            expect(getPropertyValues(htmlStyles[0].to.parseTree.nodes[0], 'color'), 'to equal', [ '#cccccc' ]);
            expect(getPropertyValues(htmlStyles[0].to.parseTree.nodes[1], 'color'), 'to equal', [ '#dddddd' ]);
        });

        it('should handle a test case with stylesheets with different media attributes', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/differentMedia/'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 'Html', 3);
            expect(assetGraph, 'to contain assets', 'Css', 7);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'});

            expect(assetGraph, 'to contain assets', 'Css', 5);
            expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
            expect(assetGraph, 'to contain relations', {from: {url: /\/index\.html$/}, type: 'HtmlStyle'}, 4);

            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0].node.hasAttribute('media'), 'to be falsy');

            const firstHtmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[0];

            expect(firstHtmlStyle.to.parseTree.nodes, 'to have length', 2);
            expect(getPropertyValues(firstHtmlStyle.to.parseTree.nodes[0], 'color'), 'to equal', [ '#aaaaaa' ]);
            expect(getPropertyValues(firstHtmlStyle.to.parseTree.nodes[1], 'color'), 'to equal', [ '#bbbbbb' ]);

            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1].node.getAttribute('media'), 'to equal', 'aural and (device-aspect-ratio: 16/9)');

            const secondHtmlStyle = assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[1];

            expect(secondHtmlStyle.to.parseTree.nodes, 'to have length', 2);
            expect(getPropertyValues(secondHtmlStyle.to.parseTree.nodes[0], 'color'), 'to equal', [ '#cccccc' ]);
            expect(getPropertyValues(secondHtmlStyle.to.parseTree.nodes[1], 'color'), 'to equal', [ '#dddddd' ]);

            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].node.getAttribute('media'), 'to equal', 'screen');

            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[2].to.url, 'to match', /\/e\.css$/);

            expect(assetGraph.findRelations({from: {url: /\/index\.html$/}, type: 'HtmlStyle'})[3].to.url, 'to match', /\/f\.css$/);
        });

        it('should handle a test with two pages, each containing an external HtmlStyle followed by an inline one', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/externalHtmlStyleFollowedByInlineStyle/'})
                .loadAssets('*.html')
                .populate()
                .bundleRelations({type: ['HtmlStyle']}, {strategyName: 'sharedBundles'});

            expect(assetGraph, 'to contain assets', 'Css', 3);
            expect(assetGraph, 'to contain asset', {type: 'Css', isInline: false, url: /\/a\.css$/});
            expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true}, 2);
            expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true, text: '.body{foo:bar;}'}, 2);
        });

        it('should handle a duplicated script', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/duplicateScript/'})
                .loadAssets('index.html')
                .populate()
                .bundleRelations({type: ['HtmlScript'], to: {isLoaded: true}}, {strategyName: 'sharedBundles'});

            expect(assetGraph, 'to contain assets', 'JavaScript', 2);

            expect(assetGraph, 'to contain asset', {type: 'JavaScript', isInline: false, url: /\/a\.js$/});

            expect(assetGraph, 'to contain asset', {type: 'JavaScript', isInline: false, url: /\/b\.js$/});

            expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

            expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            expect(assetGraph, 'to contain asset', {type: 'JavaScript', text: 'alert(\'a\');\n'});
            expect(assetGraph, 'to contain asset', {type: 'JavaScript', text: 'alert(\'b\');\n'});
        });

        it('treat defer="defer" and async="async" as bundle discriminators and treat additional attributes like "nobundle"', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/additionalHtmlScriptAttributes'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 12);
            expect(assetGraph, 'to contain asset', 'Html');
            expect(assetGraph, 'to contain assets', 'JavaScript', 11);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 11);

            await assetGraph.bundleRelations({type: 'HtmlScript'}, {strategyName: 'sharedBundles'});

            expect(assetGraph, 'to contain relations', 'HtmlScript', 6);
            const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
            expect(htmlScripts[0].to.text, 'to equal', 'alert(\'a\');\nalert(\'b\');\nalert(\'c\');');
            expect(htmlScripts[1].node.getAttribute('data-foo'), 'to equal', 'bar');
            expect(htmlScripts[1].to.text, 'to equal', 'alert(\'d\');');
            expect(htmlScripts[2].to.text, 'to equal', 'alert(\'e\');');
            expect(htmlScripts[3].to.text, 'to equal', 'alert(\'f\');\nalert(\'g\');');
            expect(htmlScripts[4].to.text, 'to equal', 'alert(\'h\');\nalert(\'i\');');
            expect(htmlScripts[5].to.text, 'to equal', 'alert(\'j\');\nalert(\'k\');');
        });

        it('should not bundle stylesheets with additional attributes on the tag', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/additionalHtmlStyleAttributes'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 10);
            expect(assetGraph, 'to contain asset', 'Html');
            expect(assetGraph, 'to contain assets', 'Css', 9);
            expect(assetGraph, 'to contain relations', 'HtmlStyle', 9);

            await assetGraph.bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'});

            expect(assetGraph, 'to contain relations', 'HtmlStyle', 5);
            const htmlStyles = assetGraph.findRelations({type: 'HtmlStyle'});
            expect(htmlStyles[0].to.text, 'to equal', 'body {color: #000;}body {color: #111;}body {color: #222;}');
            expect(htmlStyles[1].node.getAttribute('data-foo'), 'to equal', 'bar');
            expect(htmlStyles[1].to.text, 'to equal', 'body {color: #333;}');
            expect(htmlStyles[2].to.text, 'to equal', 'body {color: #444;}');
            expect(htmlStyles[3].node.getAttribute('media'), 'to equal', 'screen');
            expect(htmlStyles[3].to.text, 'to equal', 'body {color: #555;}body {color: #666;}');
            expect(htmlStyles[4].node.getAttribute('media'), 'to equal', 'projection');
            expect(htmlStyles[4].to.text, 'to equal', 'body {color: #777;}body {color: #888;}');
        });
    });

    it('should reattach the outgoing relations correctly when bundling assets that reside in different directories', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRelations/stylesheetsInDifferentDirs/'})
            .loadAssets('index.html')
            .populate()
            .bundleRelations({type: 'HtmlStyle'}, {strategyName: 'sharedBundles'});

        expect(assetGraph, 'to contain asset', 'Css');
        expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to contain', 'url(foo/bar.png)')
            .and('to contain', 'url(foo/blah/yadda.png)');
    });
});
