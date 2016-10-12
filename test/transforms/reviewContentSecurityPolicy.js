/*global describe, it*/
var expect = require('../unexpected-with-plugins');
var sinon = require('sinon');
var AssetGraph = require('../../lib/');

describe('transforms/reviewContentSecurityPolicy', function () {
    it('should not do anything for Html assets that do not have an existing policy', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/noExistingContentSecurityPolicy/'})
            .loadAssets('index.html')
            .populate()
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'ContentSecurityPolicy', 0);
            });
    });

    it('should preserve existing tokens, even if they appear superfluous', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/extraDirectives/'})
            .loadAssets('index.html')
            .populate()
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    scriptSrc: ['\'self\'', '\'unsafe-eval\'', '\'unsafe-inline\'']
                });
            });
    });

    it('should copy all tokens from default-src when introducing a new directive', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/defaultSrcWithExtraSourceExpressions/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://scriptland.com/script.js';
            })
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    defaultSrc: ['\'self\'', 'whatever.com/yadda'],
                    scriptSrc: ['\'self\'', 'http://scriptland.com', 'whatever.com/yadda']
                });
            });
    });

    it('should not copy the \'none\' token from default-src when introducing a new directive', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/defaultSrcWithExtraSourceExpressions/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://scriptland.com/script.js';
            })
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://scriptland.com/somewhere/script.js';

                var contentSecurityPolicy = assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0];
                contentSecurityPolicy.parseTree.defaultSrc = ['\'none\''];
                contentSecurityPolicy.markDirty();
            })
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    defaultSrc: ['\'none\''],
                    scriptSrc: ['http://scriptland.com']
                });
            });
    });

    describe('when assets are present on other domains', function () {
        describe('with includePath enabled for script-src and style-src', function () {
            it('should update the style-src and script-src directives of a Content-Security-Policy when no existing source expression allows the url', function () {
                return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet'})
                    .loadAssets('index.html')
                    .populate()
                    .queue(function (assetGraph) {
                        assetGraph.findAssets({type: 'Css'})[0].url = 'http://styleland.com/styles.css';
                        assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://scriptland.com/script.js';
                    })
                    .reviewContentSecurityPolicy(undefined, {update: true, includePath: ['script-src', 'styleSrc']})
                    .queue(function (assetGraph) {
                        expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                            scriptSrc: ['\'self\'', 'http://scriptland.com/script.js'],
                            styleSrc: ['\'self\'', 'http://styleland.com/styles.css']
                        });
                    });
            });
        });

        describe('with includePath:true', function () {
            it('should update the style-src and script-src directives of a Content-Security-Policy when no existing source expression allows the url', function () {
                return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet'})
                    .loadAssets('index.html')
                    .populate()
                    .queue(function (assetGraph) {
                        assetGraph.findAssets({type: 'Css'})[0].url = 'http://styleland.com/styles.css';
                        assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://scriptland.com/script.js';
                    })
                    .reviewContentSecurityPolicy(undefined, {update: true, includePath: true})
                    .queue(function (assetGraph) {
                        expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                            scriptSrc: ['\'self\'', 'http://scriptland.com/script.js'],
                            styleSrc: ['\'self\'', 'http://styleland.com/styles.css']
                        });
                    });
            });
        });

        describe('with includePath disabled (defaults to off)', function () {
            it('should update the style-src and script-src directives of a Content-Security-Policy when no existing source expression allows the url', function () {
                return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet'})
                    .loadAssets('index.html')
                    .populate()
                    .queue(function (assetGraph) {
                        assetGraph.findAssets({type: 'Css'})[0].url = 'http://styleland.com/styles.css';
                        assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://scriptland.com/script.js';
                    })
                    .reviewContentSecurityPolicy(undefined, {update: true})
                    .queue(function (assetGraph) {
                        expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                            scriptSrc: ['\'self\'', 'http://scriptland.com'],
                            styleSrc: ['\'self\'', 'http://styleland.com']
                        });
                    });
            });
        });

        it('should just whitelist the host:port of the origin for less sensitive media types such as images', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/image/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    assetGraph.findAssets({type: 'Png'})[0].url = 'http://imageland.com/foo.png';
                })
                .reviewContentSecurityPolicy(undefined, {update: true})
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                        imgSrc: ['\'self\'', 'http://imageland.com']
                    });
                });
        });

        it('should include the port if non-default', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/image/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    assetGraph.findAssets({type: 'Png'})[0].url = 'http://imageland.com:1337/foo.png';
                })
                .reviewContentSecurityPolicy(undefined, {update: true})
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                        imgSrc: ['\'self\'', 'http://imageland.com:1337']
                    });
                });
        });

        it('should omit the port if default', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/image/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    assetGraph.findAssets({type: 'Png'})[0].url = 'http://imageland.com:80/foo.png';
                })
                .reviewContentSecurityPolicy(undefined, {update: true})
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                        imgSrc: ['\'self\'', 'http://imageland.com']
                    });
                });
        });

        it('should not update the style-src and script-src directives of a Content-Security-Policy when an existing source expression allows the url', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://scriptland.com/somewhere/script.js';

                    var contentSecurityPolicy = assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0];
                    contentSecurityPolicy.parseTree.scriptSrc = ['http://scriptland.com/somewhere/'];
                    contentSecurityPolicy.markDirty();
                })
                .reviewContentSecurityPolicy(undefined, {update: true})
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                        scriptSrc: ['http://scriptland.com/somewhere/']
                    });
                });
        });
    });

    it('should update the image-src accordingly when images are included as data: urls', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/smallImage/'})
            .loadAssets('index.html')
            .populate()
            .inlineRelations({type: 'HtmlImage'})
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    imgSrc: ['data:']
                });
            });
    });

    it('should not leave \'none\' in the list of allowed origins when adding to an existing policy', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/scriptSrcNone/'})
            .loadAssets('index.html')
            .populate()
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    scriptSrc: ['\'self\'']
                });
            });
    });

    it('should omit a directive when its origin list is identical to that of the default-src', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var contentSecurityPolicy = assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0];
                contentSecurityPolicy.parseTree.defaultSrc = ['\'self\'', 'http://scriptland.com'];
                contentSecurityPolicy.markDirty();

                assetGraph.findAssets({type: 'Css'})[0].url = 'http://styleland.com/styles.css';
                assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://scriptland.com/script.js';
            })
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    defaultSrc: ['\'self\'', 'http://scriptland.com'],
                    scriptSrc: undefined,
                    styleSrc: ['\'self\'', 'http://styleland.com']
                });
            });
    });

    it('should include hash-source fragments and add \'unsafe-inline\' for inline scripts and stylesheets when \'unsafe-inline\' is not in the existing policy', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'})
            .loadAssets('index.html')
            .populate()
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    scriptSrc: ['\'self\'', '\'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs=\'', '\'unsafe-inline\''],
                    styleSrc: ['\'self\'', '\'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw=\'', '\'unsafe-inline\'']
                });
            });
    });

    it('should not include hash-source fragments for inline scripts and stylesheets when unsafe-inline is in the existing policy', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var contentSecurityPolicy = assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0];
                contentSecurityPolicy.parseTree.scriptSrc = ['\'self\'', '\'unsafe-inline\''];
                contentSecurityPolicy.parseTree.styleSrc = ['\'self\'', '\'unsafe-inline\''];
                contentSecurityPolicy.markDirty();
            })
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    scriptSrc: ['\'self\'', '\'unsafe-inline\''],
                    styleSrc: ['\'self\'', '\'unsafe-inline\'']
                });
            });
    });

    it('should not include hash-source fragments for inline scripts and stylesheets when unsafe-inline is in the existing default-src and there is no script-src or style-src', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var contentSecurityPolicy = assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0];
                delete contentSecurityPolicy.parseTree.scriptSrc;
                delete contentSecurityPolicy.parseTree.styleSrc;
                contentSecurityPolicy.parseTree.defaultSrc = ['\'self\'', '\'unsafe-inline\''];
                contentSecurityPolicy.markDirty();
            })
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    defaultSrc: ['\'self\'', '\'unsafe-inline\''],
                    scriptSrc: undefined,
                    styleSrc: undefined
                });
            });
    });

    it('should upgrade nonces to hashes and remove the nonce attributes (and add \'unsafe-inline\' for CSP1 compatibility)', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheetWithNonces/'})
            .loadAssets('index.html')
            .populate()
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    scriptSrc: ['\'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs=\'', "'unsafe-inline'"],
                    styleSrc: ['\'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw=\'', "'unsafe-inline'"]
                });
                var html = assetGraph.findAssets({type: 'Html'})[0].text;
                expect(html, 'not to contain', '<script nonce').and('not to contain', '<style type="text/css" nonce');
            });
    });

    it('should remove a nonce from the CSP when relations with the same nonce have been bundled (integration with bundleRelations)', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/bundledScriptsWithSameNonce/'})
            .loadAssets('index.html')
            .populate()
            .bundleRelations({type: 'HtmlStyle'})
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                    styleSrc: ['\'self\'']
                });
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'not to contain', 'nonce');
            });
    });

    it('should always remove a nonce with a value of \"developmentonly\", even when it is not referenced by a <script> or <link>', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/unreferencedDevelopmentOnlyNonce/'})
            .loadAssets('index.html')
            .populate()
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'not to contain', 'nonce-developmentonly');
            });
    });

    it('should leave the empty script as an allowed hash when removing a nonce so \'unsafe-inline\' would be left alone and thus take effect with CSP2+', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/upgradedNonceAndUnsafeInline/'})
            .loadAssets('index.html')
            .populate()
            .externalizeRelations({type: 'HtmlScript'})
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to exhaustively satisfy', {
                    scriptSrc: ["'self'", "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='", "'unsafe-inline'"]
                });
            });
    });

    it('should leave the empty script as an allowed hash when removing nonces so \'unsafe-inline\' would be left alone and thus take effect with CSP2+', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/nonceDevelopmentOnlyAndUnsafeInline/'})
            .loadAssets('index.html')
            .populate()
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to exhaustively satisfy', {
                    styleSrc: ["'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='", "'unsafe-inline'"]
                });
            });
    });

    describe('with update:false', function () {
        it('emits a warn event when an inline relation is prohibited by the policy', function () {
            var warnSpy = sinon.spy().named('warn');
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'})
                .on('warn', warnSpy)
                .loadAssets('index.html')
                .populate()
                .reviewContentSecurityPolicy(undefined, {update: false})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'to have calls satisfying', function () {
                        warnSpy(
                            new Error(
                                'testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html: An asset violates the style-src \'self\' Content-Security-Policy directive:\n' +
                                '  inline Css in testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html'
                            )
                        );
                        warnSpy(
                            new Error(
                                'testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html: An asset violates the script-src \'self\' Content-Security-Policy directive:\n' +
                                '  inline JavaScript in testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html'
                            )
                        );
                    });
                });
        });

        it('should emit a warn even when a relation to an asset on a non-whitelisted origin is present', function () {
            var warnSpy = sinon.spy().named('warn');
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'})
                .on('warn', warnSpy)
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    var contentSecurityPolicy = assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0];
                    contentSecurityPolicy.parseTree.scriptSrc = ['foo.com'];
                    contentSecurityPolicy.parseTree.styleSrc = ['\'unsafe-inline\''];
                    contentSecurityPolicy.markDirty();
                    assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://bar.com/yadda.js';
                })
                .reviewContentSecurityPolicy(undefined, {update: false})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'to have calls satisfying', function () {
                        warnSpy(
                            new Error(
                                'testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html: An asset violates the script-src foo.com Content-Security-Policy directive:\n' +
                                '  http://bar.com/yadda.js'
                            )
                        );
                    });
                });
        });

        it('should not warn when a relation to an asset in a whitelisted origin is present', function () {
            var warnSpy = sinon.spy().named('warn');
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'})
                .on('warn', warnSpy)
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    var contentSecurityPolicy = assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0];
                    contentSecurityPolicy.parseTree.scriptSrc = ['bar.com'];
                    contentSecurityPolicy.parseTree.styleSrc = ['\'unsafe-inline\''];
                    contentSecurityPolicy.markDirty();
                    assetGraph.findAssets({type: 'JavaScript'})[0].url = 'http://bar.com/yadda.js';
                })
                .reviewContentSecurityPolicy(undefined, {update: false})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'to have calls satisfying', []);
                });
        });

        it('emits a warn event when a relation is prohibited by a \'none\' directive', function () {
            var warnSpy = sinon.spy().named('warn');
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/scriptSrcNone/'})
                .on('warn', warnSpy)
                .loadAssets('index.html')
                .populate()
                .reviewContentSecurityPolicy(undefined, {update: false})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'to have calls satisfying', function () {
                        warnSpy(
                            new Error(
                                'testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/scriptSrcNone/index.html: An asset violates the script-src \'none\' Content-Security-Policy directive:\n' +
                                '  testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/scriptSrcNone/script.js'
                            )
                        );
                    });
                });
        });

        it('does not warn when a relation is whitelisted by a nonce', function () {
            var warnSpy = sinon.spy().named('warn');
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheetWithNonces/'})
                .on('warn', warnSpy)
                .loadAssets('index.html')
                .populate()
                .reviewContentSecurityPolicy(undefined, {update: false})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'to have calls satisfying', []);
                });
        });
    });

    describe('when HTTP redirects are present', function () {
        it('should whitelist both the redirect source and target', function () {
            return expect(function () {
                return new AssetGraph()
                    .loadAssets('http://www.example.com/')
                    .populate()
                    .reviewContentSecurityPolicy(undefined, {update: true})
                    .queue(function (assetGraph) {
                        expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to satisfy', {
                            styleSrc: ["'self'", 'http://www.somewhereelse.com', 'http://www.yetanotherone.com']
                        });
                    });
            }, 'with http mocked out', [
                {
                    request: 'GET http://www.example.com/',
                    response: {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8'
                        },
                        body: '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"><link rel="stylesheet" href="http://www.somewhereelse.com/styles.css"></head><body></body></html>'
                    }
                },
                {
                    request: 'GET http://www.somewhereelse.com/styles.css',
                    response: {
                        statusCode: 302,
                        headers: {
                            Location: 'http://www.yetanotherone.com/styles.css'
                        }
                    }
                },
                {
                    request: 'GET http://www.yetanotherone.com/styles.css',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: 'body {color: maroon;}'
                    }
                }
            ], 'not to error');
        });

        it('should only whitelist the relevant redirect steps', function () {
            return expect(function () {
                return new AssetGraph()
                    .loadAssets(['http://www.example.com/page1.html', 'http://www.example.com/page2.html'])
                    .populate()
                    .reviewContentSecurityPolicy(undefined, {update: true})
                    .queue(function (assetGraph) {
                        expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to exhaustively satisfy', {
                            styleSrc: ["'self'"],
                            scriptSrc: ['http://www.somewhereelse.com', 'http://www.yetanotherone.com' ]
                        });
                        expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[1].parseTree, 'to exhaustively satisfy', {
                            styleSrc: ["'self'", 'http://www.somewhereelse.com', 'http://www.yetanotherone.com']
                        });
                    });
            }, 'with http mocked out', [
                {
                    request: 'GET http://www.example.com/page1.html',
                    response: {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8'
                        },
                        body: '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"></head><body><script src="http://www.somewhereelse.com/styles.css"></body></html>'
                    }
                },
                {
                    request: 'GET http://www.example.com/page2.html',
                    response: {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8'
                        },
                        body: '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"><link rel="stylesheet" href="http://www.somewhereelse.com/styles.css"></head><body></body></html>'
                    }
                },
                {
                    request: 'GET http://www.somewhereelse.com/styles.css',
                    response: {
                        statusCode: 302,
                        headers: {
                            Location: 'http://www.yetanotherone.com/styles.css'
                        }
                    }
                },
                {
                    request: 'GET http://www.yetanotherone.com/styles.css',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: 'body {color: maroon;}'
                    }
                }
            ], 'not to error');
        });

        it('should not break when there is a redirection loop', function () {
            return expect(function () {
                return new AssetGraph()
                    .loadAssets('http://www.example.com/')
                    .populate()
                    .reviewContentSecurityPolicy(undefined, {update: true})
                    .queue(function (assetGraph) {
                        expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to exhaustively satisfy', {
                            styleSrc: ["'self'"],
                            scriptSrc: ['http://www.somewhereelse.com', 'http://www.yetanotherone.com' ]
                        });
                    });
            }, 'with http mocked out', [
                {
                    request: 'GET http://www.example.com/',
                    response: {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8'
                        },
                        body: '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"></head><body><script src="http://www.somewhereelse.com/styles.css"></body></html>'
                    }
                },
                {
                    request: 'GET http://www.somewhereelse.com/styles.css',
                    response: {
                        statusCode: 302,
                        headers: {
                            Location: 'http://www.yetanotherone.com/styles.css'
                        }
                    }
                },
                {
                    request: 'GET http://www.yetanotherone.com/styles.css',
                    response: {
                        statusCode: 302,
                        headers: {
                            Location: 'http://www.somewhereelse.com/styles.css'
                        }
                    }
                }
            ], 'not to error');
        });
    });

    it('should not list the protocol when there is a protocol-relative relation on the path', function () {
        return expect(function () {
            return new AssetGraph()
                .loadAssets('http://www.example.com/')
                .populate()
                .reviewContentSecurityPolicy(undefined, {update: true})
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to exhaustively satisfy', {
                        styleSrc: ["'self'", 'www.somewhereelse.com'],
                        imgSrc: ['www.somewhereelse.com']
                    });
                });
        }, 'with http mocked out', [
            {
                request: 'GET http://www.example.com/',
                response: {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8'
                    },
                    body: '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"><link rel="stylesheet" href="//www.somewhereelse.com/styles.css"></head><body></body></html>'
                }
            },
            {
                request: 'GET http://www.somewhereelse.com/styles.css',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: 'body {background-image: url(foo.svg);}'
                }
            },
            {
                request: 'GET http://www.somewhereelse.com/foo.svg',
                response: {
                    statusCode: 302,
                    headers: {
                        'Content-Type': 'image/svg+xml'
                    },
                    body: '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg></svg>'
                }
            }
        ], 'not to error');
    });

    it('should hash an inline script when there is a nonce, even when \'unsafe-inline\' is permitted', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/nonceAndUnsafeInline/'})
            .loadAssets('index.html')
            .populate()
            .reviewContentSecurityPolicy(undefined, {update: true})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'ContentSecurityPolicy');
                expect(assetGraph.findAssets({type: 'ContentSecurityPolicy'})[0].parseTree, 'to exhaustively satisfy', {
                    scriptSrc: ["'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs='", "'unsafe-inline'"]
                });
            });
    });
});
