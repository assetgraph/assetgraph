var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib');

var httpception = require('httpception');

describe('transforms/subsetGoogleFonts', function () {

    it('should handle HTML <link rel=stylesheet>', function () {
        httpception([
            {
                request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: [
                        '@font-face {',
                        '  font-family: \'Open Sans\';',
                        '  font-style: normal;',
                        '  font-weight: 400;',
                        '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=ZC3Pxff5o11SVa40-M1YDXY_vlID40_xbxWXk1HqQcs&skey=62c1cbfccc78b4b2&v=v13) format(\'woff\');',
                        '}'
                    ].join('\n')
                }
            },
            {
                request: 'GET https://fonts.gstatic.com/l/font?kit=ZC3Pxff5o11SVa40-M1YDXY_vlID40_xbxWXk1HqQcs&skey=62c1cbfccc78b4b2&v=v13',
                response: {
                    headers: {
                        'Content-Type': 'font/woff'
                    },
                    body: new Buffer('foo', 'base64')
                }
            }
        ]);

        return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/html-link/'})
            .loadAssets('index.html')
            .populate({
                followRelations: {
                    crossorigin: false
                }
            })
            .subsetGoogleFonts({
                inlineSubsets: false
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', {
                    type: 'HtmlStyle',
                    from: {
                        type: 'Html',
                        fileName: 'index.html'
                    },
                    to: {
                        type: 'Css',
                        url: /\/google-font-subsets\/Open\+Sans:400-\d+\.css$/,
                        isLoaded: true
                    }
                });

                expect(assetGraph, 'to contain relation', {
                    type: 'CssFontFaceSrc',
                    from: {
                        type: 'Css',
                        url: /\/google-font-subsets\/Open\+Sans:400-\d+\.css$/
                    },
                    to: {
                        type: 'Asset',
                        url: /\/google-font-subsets\/Open\+Sans:400-\d+\.woff$/,
                        isLoaded: true
                    }
                });
            });
    });

    it('should handle CSS @import', function () {
        httpception([
            {
                request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: [
                        '@font-face {',
                        '  font-family: \'Open Sans\';',
                        '  font-style: normal;',
                        '  font-weight: 400;',
                        '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=ZC3Pxff5o11SVa40-M1YDXY_vlID40_xbxWXk1HqQcs&skey=62c1cbfccc78b4b2&v=v13) format(\'woff\');',
                        '}'
                    ].join('\n')
                }
            },
            {
                request: 'GET https://fonts.gstatic.com/l/font?kit=ZC3Pxff5o11SVa40-M1YDXY_vlID40_xbxWXk1HqQcs&skey=62c1cbfccc78b4b2&v=v13',
                response: {
                    headers: {
                        'Content-Type': 'font/woff'
                    },
                    body: new Buffer('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', 'base64')
                }
            }
        ]);

        return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/css-import/'})
            .loadAssets('index.html')
            .populate({
                followRelations: {
                    crossorigin: false
                }
            })
            .subsetGoogleFonts({
                inlineSubsets: false
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', {
                    type: 'HtmlStyle',
                    to: {
                        type: 'Css',
                        fileName: /Open\+Sans:400-\d+\.css/,
                        isLoaded: true
                    },
                    crossorigin: false
                });

                expect(assetGraph, 'to contain relation', {
                    type: 'CssFontFaceSrc',
                    from: {
                        type: 'Css',
                        fileName: /Open\+Sans:400-\d+\.css/
                    },
                    to: {
                        type: 'Asset',
                        fileName: /Open\+Sans:400-\d+\.woff/,
                        isLoaded: true
                    }
                });

                expect(assetGraph, 'to contain no relation', {
                    type: 'CssImport'
                });

                expect(assetGraph, 'to contain relation including unresolved', {
                    type: 'JavaScriptStaticUrl',
                    href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                });

                expect(assetGraph, 'to contain relation including unresolved', {
                    type: 'HtmlStyle',
                    href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                    from: {
                        type: 'Html'
                    }
                });
            });
    });

    it('should handle multiple font-families', function () {
        httpception([
            {
                request: 'GET https://fonts.googleapis.com/css?family=Jim+Nightshade:400&text=Helo',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: [
                        '@font-face {',
                        '  font-family: "Jim Nightshade";',
                        '  font-style: normal;',
                        '  font-weight: 400;',
                        '  src: local("Jim Nightshade"), local("JimNightshade-Regular"), url(https://fonts.gstatic.com/l/font?kit=_n43lYHXVWNgXegdYRIK9INhpK5NK1BotPe30q0xp6Q&skey=a1cdb4741ac7b833&v=v4) format("woff");',
                        '}'
                    ].join('\n')
                }
            },
            {
                request: 'GET https://fonts.googleapis.com/css?family=Montserrat:400&text=Dakr',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: [
                        '@font-face {',
                        '  font-family: "Montserrat";',
                        '  font-style: normal;',
                        '  font-weight: 400;',
                        '  src: local("Montserrat Regular"), local("Montserrat-Regular"), url(https://fonts.gstatic.com/l/font?kit=dvTfUY0Ly8XsfmkactButUFqwElyQhIsO2Cvw-n5lNI&skey=7bc19f711c0de8f&v=v10) format("woff");',
                        '}'
                    ].join('\n')
                }
            },
            {
                request: 'GET https://fonts.googleapis.com/css?family=Space+Mono:400&text=Celru',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: [
                        '@font-face {',
                        '  font-family: "Space Mono";',
                        '  font-style: normal;',
                        '  font-weight: 400;',
                        '  src: local("Space Mono"), local("SpaceMono-Regular"), url(https://fonts.gstatic.com/l/font?kit=bjPdZ9rVJBis0VL4JCoa7q88CPKkd5UnrKmO8Wvhwmw&skey=5e801b58db657470&v=v1) format("woff");',
                        '}'
                    ].join('\n')
                }
            },
            {
                request: 'GET https://fonts.gstatic.com/l/font?kit=_n43lYHXVWNgXegdYRIK9INhpK5NK1BotPe30q0xp6Q&skey=a1cdb4741ac7b833&v=v4',
                response: {
                    headers: {
                        'Content-Type': 'font/woff'
                    },
                    body: new Buffer('foo', 'base64')
                }
            },
            {
                request: 'GET https://fonts.gstatic.com/l/font?kit=dvTfUY0Ly8XsfmkactButUFqwElyQhIsO2Cvw-n5lNI&skey=7bc19f711c0de8f&v=v10',
                response: {
                    headers: {
                        'Content-Type': 'font/woff'
                    },
                    body: new Buffer('bar', 'base64')
                }
            },
            {
                request: 'GET https://fonts.gstatic.com/l/font?kit=bjPdZ9rVJBis0VL4JCoa7q88CPKkd5UnrKmO8Wvhwmw&skey=5e801b58db657470&v=v1',
                response: {
                    headers: {
                        'Content-Type': 'font/woff'
                    },
                    body: new Buffer('baz', 'base64')
                }
            }
        ]);

        return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/multi-family/'})
            .loadAssets('index.html')
            .populate({
                followRelations: {
                    crossorigin: false
                }
            })
            .subsetGoogleFonts({
                inlineSubsets: false
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', {
                    type: 'HtmlStyle',
                    to: {
                        type: 'Css',
                        fileName: /Jim\+Nightshade:400-\d+\.css/,
                        isLoaded: true
                    }
                });

                expect(assetGraph, 'to contain relation', {
                    type: 'HtmlStyle',
                    to: {
                        type: 'Css',
                        fileName: /Montserrat:400-\d+\.css/,
                        isLoaded: true
                    }
                });

                expect(assetGraph, 'to contain relation', {
                    type: 'HtmlStyle',
                    to: {
                        type: 'Css',
                        fileName: /Space\+Mono:400-\d+\.css/,
                        isLoaded: true
                    }
                });

                expect(assetGraph, 'to contain relation', {
                    type: 'CssFontFaceSrc',
                    from: {
                        type: 'Css',
                        fileName: /Jim\+Nightshade:400-\d+\.css/
                    },
                    to: {
                        type: 'Asset',
                        fileName: /Jim\+Nightshade:400-\d+\.woff/,
                        isLoaded: true
                    }
                });

                expect(assetGraph, 'to contain relation', {
                    type: 'CssFontFaceSrc',
                    from: {
                        type: 'Css',
                        fileName: /Montserrat:400-\d+\.css/
                    },
                    to: {
                        type: 'Asset',
                        fileName: /Montserrat:400-\d+\.woff/,
                        isLoaded: true
                    }
                });

                expect(assetGraph, 'to contain relation', {
                    type: 'CssFontFaceSrc',
                    from: {
                        type: 'Css',
                        fileName: /Space\+Mono:400-\d+\.css/
                    },
                    to: {
                        type: 'Asset',
                        fileName: /Space\+Mono:400-\d+\.woff/,
                        isLoaded: true
                    }
                });
            });
    });

    it('should handle multiple font-weights and font-style', function () {
        httpception([

            {
                request: 'GET https://fonts.googleapis.com/css?family=Roboto:500&text=Helo',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: [
                        '@font-face {',
                        '  font-family: "Roboto";',
                        '  font-style: normal;',
                        '  font-weight: 500;',
                        '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=7r9VFx4x5d5pFr_tRoChT3Y_vlID40_xbxWXk1HqQcs&skey=ee881451c540fdec&v=v15) format("woff");',
                        '}'
                    ].join ('\n')
                }
            },

            {
                request: 'GET https://fonts.googleapis.com/css?family=Roboto:400&text=Dakr',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: [
                        '@font-face {',
                        '  font-family: "Roboto";',
                        '  font-style: normal;',
                        '  font-weight: 400;',
                        '  src: local("Roboto"), local("Roboto-Regular"), url(https://fonts.gstatic.com/l/font?kit=mhx02Ar2NG4Af4ZMyWe7TTV8WDY78pkB0e3oe2-PKo4&skey=a0a0114a1dcab3ac&v=v15) format("woff");',
                        '}'
                    ].join ('\n')
                }
            },

            {
                request: 'GET https://fonts.googleapis.com/css?family=Roboto:300i&text=Celru',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: [
                        '@font-face {',
                        '  font-family: "Roboto";',
                        '  font-style: italic;',
                        '  font-weight: 300;',
                        '  src: local("Roboto Light Italic"), local("Roboto-LightItalic"), url(https://fonts.gstatic.com/l/font?kit=iE8HhaRzdhPxC93dOdA05_vtLO2S9yBEqvyVXi2mRhg&skey=8f644060176e1f7e&v=v15) format("woff");',
                        '}'
                    ].join ('\n')
                }
            },

            {
                request: 'GET https://fonts.gstatic.com/l/font?kit=7r9VFx4x5d5pFr_tRoChT3Y_vlID40_xbxWXk1HqQcs&skey=ee881451c540fdec&v=v15',
                response: {
                    headers: {
                        'Content-Type': 'font/woff'
                    },
                    body: new Buffer('foo', 'base64')
                }
            },

            {
                request: 'GET https://fonts.gstatic.com/l/font?kit=mhx02Ar2NG4Af4ZMyWe7TTV8WDY78pkB0e3oe2-PKo4&skey=a0a0114a1dcab3ac&v=v15',
                response: {
                    headers: {
                        'Content-Type': 'font/woff'
                    },
                    body: new Buffer('bar', 'base64')
                }
            },

            {
                request: 'GET https://fonts.gstatic.com/l/font?kit=iE8HhaRzdhPxC93dOdA05_vtLO2S9yBEqvyVXi2mRhg&skey=8f644060176e1f7e&v=v15',
                response: {
                    headers: {
                        'Content-Type': 'font/woff'
                    },
                    body: new Buffer('baz', 'base64')
                }
            }
        ]);

        return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/multi-weight/'})
            .loadAssets('index.html')
            .populate({
                followRelations: {
                    crossorigin: false
                }
            })
            .subsetGoogleFonts({
                inlineSubsets: false
            })
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations({ type: 'HtmlStyle' }), 'to satisfy', [
                    {
                        type: 'HtmlStyle',
                        to: {
                            type: 'Css',
                            fileName: /Roboto:500-\d+\.css/,
                            isLoaded: true,
                            outgoingRelations: [
                                {
                                    type: 'CssFontFaceSrc',
                                    to: {
                                        type: 'Asset',
                                        url: /Roboto:500-\d+\.woff/,
                                        isLoaded: true
                                    }
                                }
                            ]
                        }
                    },
                    {
                        type: 'HtmlStyle',
                        to: {
                            type: 'Css',
                            fileName: /Roboto:400-\d+\.css/,
                            isLoaded: true,
                            outgoingRelations: [
                                {
                                    type: 'CssFontFaceSrc',
                                    to: {
                                        type: 'Asset',
                                        url: /Roboto:400-\d+\.woff/,
                                        isLoaded: true
                                    }
                                }
                            ]
                        }
                    },
                    {
                        type: 'HtmlStyle',
                        to: {
                            type: 'Css',
                            fileName: /Roboto:300i-\d+\.css/,
                            isLoaded: true,
                            outgoingRelations: [
                                {
                                    type: 'CssFontFaceSrc',
                                    to: {
                                        type: 'Asset',
                                        url: /Roboto:300i-\d+\.woff/,
                                        isLoaded: true
                                    }
                                }
                            ]
                        }
                    },
                    { type: 'HtmlStyle', to: { isInline: true }}
                ]);

                expect(assetGraph.findAssets({type: 'Css', isInline: true})[0].text, 'to contain', 'font-family: Roboto__subset');
            });
    });

    describe('when running on multiple pages with subsetPerPage:true', function () {

        it('should have an individual subset for each page', function () {
            httpception([
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=abotu',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: \'Open Sans\';',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?text=about) format(\'woff\');',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=ehmo',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: \'Open Sans\';',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?text=home) format(\'woff\');',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.gstatic.com/l/font?text=about',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff'
                        },
                        body: new Buffer('about', 'base64')
                    }
                },
                {
                    request: 'GET https://fonts.gstatic.com/l/font?text=home',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff'
                        },
                        body: new Buffer('home', 'base64')
                    }
                }
            ]);

            return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/multi-page/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: {
                        crossorigin: false
                    }
                })
                .subsetGoogleFonts({
                    inlineSubsets: false,
                    subsetPerPage: true
                })
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });
                    expect(assetGraph, 'to contain asset', { fileName: 'about.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];
                    var about = assetGraph.findAssets({ fileName: 'about.html' })[0];

                    // Subsets
                    expect(assetGraph.findRelations({ type: 'HtmlStyle', crossorigin: false, to: { isInline: false }}), 'to satisfy', [
                        {
                            type: 'HtmlStyle',
                            from: index,
                            to: {
                                url: /\/google-font-subsets\/Open\+Sans:400-\d+\.css$/,
                                isLoaded: true,
                                isInline: false,
                                outgoingRelations: [
                                    {
                                        type: 'CssFontFaceSrc',
                                        hrefType: 'relative',
                                        to: {
                                            url: /Open\+Sans:400-\d+\.woff$/,
                                            isLoaded: true,
                                            isInline: false
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            from: about,
                            to: {
                                url: /\/google-font-subsets\/Open\+Sans:400-\d+\.css$/,
                                isLoaded: true,
                                isInline: false,
                                outgoingRelations: [
                                    {
                                        type: 'CssFontFaceSrc',
                                        hrefType: 'relative',
                                        to: {
                                            url: /Open\+Sans:400-\d+\.woff$/,
                                            isLoaded: true,
                                            isInline: false
                                        }
                                    }
                                ]
                            }
                        }
                    ]);

                    // Filament group async css load of original google font css
                    expect(assetGraph.findRelations({ crossorigin: true }, true), 'to satisfy', [
                        {
                            type: 'HtmlStyle',
                            from: index,
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                        },
                        {
                            type: 'JavaScriptStaticUrl',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                            from: {
                                nonInlineAncestor: index
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            from: about,
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                        },
                        {
                            type: 'JavaScriptStaticUrl',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                            from: {
                                nonInlineAncestor: about
                            }
                        }
                    ]);
                });
        });
    });

    describe('when running on multiple pages with subsetPerPage:false', function () {
        it('should share a common subset across pages', function () {
            httpception([
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=abehmotu',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: \'Open Sans\';',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?text=abouthome) format(\'woff\');',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.gstatic.com/l/font?text=abouthome',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff'
                        },
                        body: new Buffer('abouthome', 'base64')
                    }
                }
            ]);

            return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/multi-page/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: {
                        crossorigin: false
                    }
                })
                .subsetGoogleFonts({
                    inlineSubsets: false,
                    subsetPerPage: false
                })
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });
                    expect(assetGraph, 'to contain asset', { fileName: 'about.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];
                    var about = assetGraph.findAssets({ fileName: 'about.html' })[0];

                    var relations = assetGraph.findRelations(AssetGraph.query.or(
                        {
                            type: AssetGraph.query.not('HtmlAnchor'),
                            to: {
                                isInline: false
                            }
                        },
                        { crossorigin: true }
                    ), true);

                    expect(relations, 'to satisfy', [
                        {
                            type: 'HtmlStyle',
                            from: index,
                            href: /\/google-font-subsets\/Open\+Sans:400-\d+\.css/
                        },
                        {
                            type: 'HtmlStyle',
                            from: about,
                            href: /\/google-font-subsets\/Open\+Sans:400-\d+\.css/
                        },
                        {
                            type: 'HtmlStyle',
                            from: index,
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                        },
                        {
                            type: 'JavaScriptStaticUrl',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                            from: {
                                nonInlineAncestor: index
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            from: about,
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                        },
                        {
                            type: 'JavaScriptStaticUrl',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                            from: {
                                nonInlineAncestor: about
                            }
                        },
                        {
                            type: 'CssFontFaceSrc',
                            from: { 'fileName': /Open\+Sans:400-\d+\.css/ },
                            href: /Open\+Sans:400-\d+\.woff/
                        }
                    ]);
                });
        });
    });


});

