var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib');

var proxyquire = require('proxyquire');
var httpception = require('httpception');

var fontCssUrlRegExp = /\/subfont\/fonts-[a-z0-9]{10}\.css$/;


var defaultGoogleFontSubsetMock = [
    {
        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
        response: {
            headers: {
                'Content-Type': 'text/css'
            },
            body: [
                '@font-face {',
                '  font-family: \'Open Sans\';',
                '  font-style: normal;',
                '  font-weight: 400;',
                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400) format(\'woff\');',
                '}'
            ].join('\n')
        }
    },
    {
        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo&format=woff2',
        response: {
            headers: {
                'Content-Type': 'text/css'
            },
            body: [
                '@font-face {',
                '  font-family: \'Open Sans\';',
                '  font-style: normal;',
                '  font-weight: 400;',
                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff2) format(\'woff2\');',
                '}'
            ].join('\n')
        }
    },
    {
        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo&format=woff',
        response: {
            headers: {
                'Content-Type': 'text/css'
            },
            body: [
                '@font-face {',
                '  font-family: \'Open Sans\';',
                '  font-style: normal;',
                '  font-weight: 400;',
                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff) format(\'woff\');',
                '}'
            ].join('\n')
        }
    },
    {
        request: 'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff2',
        response: {
            headers: {
                'Content-Type': 'font/woff2'
            },
            body: new Buffer('Open+Sans:400&text=Helo&format=woff2', 'base64')
        }
    },
    {
        request: 'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff',
        response: {
            headers: {
                'Content-Type': 'font/woff'
            },
            body: new Buffer('Open+Sans:400&text=Helo&format=woff', 'base64')
        }
    }
];

var defaultLocalSubsetMock = [
    {
        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
        response: {
            headers: {
                'Content-Type': 'text/css'
            },
            body: [
                '@font-face {',
                '  font-family: \'Open Sans\';',
                '  font-style: normal;',
                '  font-weight: 400;',
                '  src: local(\'Open Sans Regular\'), local(\'OpenSans-Regular\'), url(https://fonts.gstatic.com/s/opensans/v15/cJZKeOuBrn4kERxqtaUH3aCWcynf_cDxXwCLxiixG1c.ttf) format(\'truetype\');',
                '}'
            ].join('\n')
        }
    },
    {
        request: 'GET https://fonts.gstatic.com/s/opensans/v15/cJZKeOuBrn4kERxqtaUH3aCWcynf_cDxXwCLxiixG1c.ttf',
        response: {
            headers: {
                'Content-Type': 'font/ttf'
            },
            body: new Buffer('AAEAAAAKAIAAAwAgT1MvMgSEBCEAAAEoAAAATmNtYXAADABzAAABgAAAACxnbHlmCAE5AgAAAbQAAAAUaGVhZAPk4EQAAACsAAAANmhoZWEIAQQDAAAA5AAAACRobXR4BAAAAAAAAXgAAAAIbG9jYQAKAAAAAAGsAAAABm1heHAABAACAAABCAAAACBuYW1lACMIXgAAAcgAAAAgcG9zdAADAAAAAAHoAAAAIAABAAAAAQAAbEJJk18PPPUAAgQAAAAAANBme+sAAAAA0GkfZAAAAAAEAAQAAAAAAAACAAAAAAAAAAEAAAQAAAAAAAQAAAAAAAQAAAEAAAAAAAAAAAAAAAAAAAACAAEAAAACAAIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGQAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAIAQAAAAAAAQAAAAAAAAAAAAEAAAAAAAAAQADAAEAAAAMAAQAIAAAAAQABAABAAAAQP//AAAAQP///8EAAQAAAAAAAAAAAAoAAAABAAAAAAQABAAAAQAAMQEEAAQAAAAAAgAeAAMAAQQJAAEAAgAAAAMAAQQJAAIAAgAAAEAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64')
            // body: new Buffer('2345678', 'base64')
        }
    }
];


describe('transforms/subsetGoogleFonts', function () {

    describe('without fonttools installed', function () {
        before(function () {
            // Mock on
            proxyquire('../../lib/transforms/subsetGoogleFonts', {
                '../util/fonts/subsetLocalFont': null
            });
        });

        after(function () {
            // Mock off
            proxyquire.noPreserveCache();
            proxyquire('../../lib/transforms/subsetGoogleFonts', {
                '../util/fonts/subsetLocalFont': require('../../lib/util/fonts/subsetLocalFont')
            });
        });

        it('should emit a warning about font subsetting tool not being available', function () {
            httpception();

            var warnings = [];

            return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/local-single/'})
                .on('warn', function (warning) {
                    warnings.push(warning);
                })
                .loadAssets('index.html')
                .populate({
                    followRelations: {
                        crossorigin: false
                    }
                })
                .subsetGoogleFonts({
                    inlineSubsets: false
                })
                .queue(function () {
                    expect(warnings, 'to satisfy', [
                        expect.it('to be an', Error) // Can't get the right type of error due to limited mocking abilities
                    ]);
                });
        });

        it('should preload local fonts that it could not subset', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/local-single/'})
                .loadAssets('index.html')
                .populate()
                .subsetGoogleFonts({
                    inlineSubsets: false
                })
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                    expect(index.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: '/OpenSans.ttf',
                            to: {
                                isLoaded: true
                            },
                            as: 'font',
                            contentType: 'font/ttf'
                        },
                        {
                            type: 'HtmlStyle',
                            to: {
                                isLoaded: true,
                                isInline: true,
                                text: expect.it('to contain', 'Open Sans'),
                                outgoingRelations: [
                                    {
                                        hrefType: 'relative',
                                        href: 'OpenSans.ttf',
                                        to: {
                                            isLoaded: true
                                        }
                                    }
                                ]
                            }
                        }
                    ]);
                });
        });

        it('should handle HTML <link rel=stylesheet>', function () {
            httpception(defaultGoogleFontSubsetMock);

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
                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                    expect(index.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Open_Sans-400-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlStyle',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/fonts-')
                                .and('to end with', '.css')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true,
                                isMinified: true,
                                text: expect.it('to contain', 'Open Sans__subset'),
                                outgoingRelations: [
                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            extension: '.woff'
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlPrefetchLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                        },
                        {
                            type: 'HtmlPreconnectLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.gstatic.com'
                        },
                        {
                            type: 'HtmlStyle',
                            to: {
                                isInline: true,
                                text: expect.it('to contain', 'Open Sans__subset')
                            }
                        },
                        {
                            type: 'HtmlScript',
                            to: {
                                isInline: true,
                                outgoingRelations: [
                                    {
                                        type: 'JavaScriptStaticUrl',
                                        href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                            node: function (node) {
                                return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                            }
                        }
                    ]);
                });
        });

        describe('with `inlineCss: true`', function () {

            it('should inline the font Css and change outgoing relations to rootRelative', function () {
                httpception(defaultGoogleFontSubsetMock);

                return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/html-link/'})
                    .loadAssets('index.html')
                    .populate({
                        followRelations: {
                            crossorigin: false
                        }
                    })
                    .subsetGoogleFonts({
                        inlineSubsets: false,
                        inlineCss: true
                    })
                    .queue(function (assetGraph) {
                        expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                        var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                        expect(index.outgoingRelations, 'to satisfy', [
                            {
                                type: 'HtmlPreloadLink',
                                hrefType: 'rootRelative',
                                href: '/subfont/Open_Sans-400-7e4f7435c9.woff2',
                                to: {
                                    isLoaded: true
                                },
                                as: 'font'
                            },
                            {
                                type: 'HtmlStyle',
                                href: undefined,
                                to: {
                                    isLoaded: true,
                                    isMinified: true,
                                    isInline: true,
                                    text: expect.it('to contain', 'Open Sans__subset'),
                                    outgoingRelations: [
                                        {
                                            hrefType: 'rootRelative',
                                            to: {
                                                contentType: 'font/woff2',
                                                extension: '.woff2'
                                            }
                                        },

                                        {
                                            hrefType: 'rootRelative',
                                            to: {
                                                contentType: 'font/woff',
                                                extension: '.woff'
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                type: 'HtmlPrefetchLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                            },
                            {
                                type: 'HtmlPreconnectLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.gstatic.com'
                            },
                            {
                                type: 'HtmlStyle',
                                to: {
                                    isInline: true,
                                    text: expect.it('to contain', 'Open Sans__subset')
                                }
                            },
                            {
                                type: 'HtmlScript',
                                to: {
                                    isInline: true,
                                    outgoingRelations: [
                                        {
                                            type: 'JavaScriptStaticUrl',
                                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                                        }
                                    ]
                                }
                            },
                            {
                                type: 'HtmlStyle',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                                node: function (node) {
                                    return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                                }
                            }
                        ]);
                    });
            });
        });

        it('should handle CSS @import', function () {
            httpception(defaultGoogleFontSubsetMock);

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
                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                    expect(index.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Open_Sans-400-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlStyle',
                            href: expect.it('to begin with', '/subfont/fonts-')
                                .and('to end with', '.css')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true,
                                isMinified: true,
                                text: expect.it('to contain', 'Open Sans__subset'),
                                outgoingRelations: [
                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            extension: '.woff'
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlPrefetchLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                        },
                        {
                            type: 'HtmlPreconnectLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.gstatic.com'
                        },
                        {
                            type: 'HtmlStyle',
                            to: {
                                isInline: true,
                                text: expect.it('to contain', 'Open Sans__subset')
                            }
                        },
                        {
                            type: 'HtmlScript',
                            to: {
                                isInline: true,
                                outgoingRelations: [
                                    {
                                        type: 'JavaScriptStaticUrl',
                                        href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                            node: function (node) {
                                return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                            }
                        }
                    ]);
                });
        });

        it('should handle multiple font-families', function () {
            httpception([
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Jim Nightshade";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Jim Nightshade"), local("JimNightshade-Regular"), url(https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400) format("woff");',
                            '}',

                            '@font-face {',
                            '  font-family: "Montserrat";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Montserrat Regular"), local("Montserrat-Regular"), url(https://fonts.gstatic.com/l/font?kit=Montserrat:400) format("woff");',
                            '}',

                            '@font-face {',
                            '  font-family: "Space Mono";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Space Mono"), local("SpaceMono-Regular"), url(https://fonts.gstatic.com/l/font?kit=Space+Mono:400) format("woff");',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Jim+Nightshade:400&text=Helo&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Jim Nightshade";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Jim Nightshade"), local("JimNightshade-Regular"), url(https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400&text=Helo&format=woff2) format("woff2");',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Montserrat:400&text=Dakr&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Montserrat";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Montserrat Regular"), local("Montserrat-Regular"), url(https://fonts.gstatic.com/l/font?kit=Montserrat:400&text=Dakr&format=woff2) format("woff2");',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Space+Mono:400&text=Celru&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Space Mono";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Space Mono"), local("SpaceMono-Regular"), url(https://fonts.gstatic.com/l/font?kit=Space+Mono:400&text=Celru&format=woff2) format("woff2");',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Jim+Nightshade:400&text=Helo&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Jim Nightshade";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Jim Nightshade"), local("JimNightshade-Regular"), url(https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400&text=Helo&format=woff) format("woff");',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Montserrat:400&text=Dakr&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Montserrat";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Montserrat Regular"), local("Montserrat-Regular"), url(https://fonts.gstatic.com/l/font?kit=Montserrat:400&text=Dakr&format=woff) format("woff");',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Space+Mono:400&text=Celru&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Space Mono";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Space Mono"), local("SpaceMono-Regular"), url(https://fonts.gstatic.com/l/font?kit=Space+Mono:400&text=Celru&format=woff) format("woff");',
                            '}'
                        ].join('\n')
                    }
                },
                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400&text=Helo&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff2'
                        },
                        body: new Buffer('Jim+Nightshade:400&text=Helo&format=woff2', 'base64')
                    }
                },
                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Montserrat:400&text=Dakr&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff2'
                        },
                        body: new Buffer('Montserrat:400&text=Dakr&format=woff2', 'base64')
                    }
                },
                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Space+Mono:400&text=Celru&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff2'
                        },
                        body: new Buffer('Space+Mono:400&text=Celru&format=woff2', 'base64')
                    }
                },
                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Jim+Nightshade:400&text=Helo&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff'
                        },
                        body: new Buffer('Jim+Nightshade:400&text=Helo&format=woff', 'base64')
                    }
                },
                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Montserrat:400&text=Dakr&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff'
                        },
                        body: new Buffer('Montserrat:400&text=Dakr&format=woff', 'base64')
                    }
                },
                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Space+Mono:400&text=Celru&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff'
                        },
                        body: new Buffer('Space+Mono:400&text=Celru&format=woff', 'base64')
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
                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                    expect(index.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Jim_Nightshade-400-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Montserrat-400-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Space_Mono-400-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlStyle',
                            href: expect.it('to begin with', '/subfont/fonts-')
                                .and('to end with', '.css')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true,
                                isMinified: true,
                                text: expect.it('to contain', 'Jim Nightshade__subset')
                                    .and('to contain', 'Montserrat__subset')
                                    .and('to contain', 'Space Mono__subset'),
                                outgoingRelations: [
                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            extension: '.woff'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            extension: '.woff'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            extension: '.woff'
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlPrefetchLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono'
                        },
                        {
                            type: 'HtmlPreconnectLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.gstatic.com'
                        },
                        {
                            type: 'HtmlStyle',
                            to: {
                                isInline: true,
                                text: expect.it('to contain', 'Jim Nightshade__subset')
                                    .and('to contain', 'Montserrat__subset')
                                    .and('to contain', 'Space Mono__subset')
                            }
                        },
                        {
                            type: 'HtmlScript',
                            to: {
                                isInline: true,
                                outgoingRelations: [
                                    {
                                        type: 'JavaScriptStaticUrl',
                                        href: 'https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono'
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            href: 'https://fonts.googleapis.com/css?family=Jim+Nightshade|Montserrat|Space+Mono',
                            node: function (node) {
                                return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                            }
                        }
                    ]);
                });
        });

        it('should handle multiple font-weights and font-style', function () {
            httpception([
                {
                    request: 'GET https://fonts.googleapis.com/css?family=Roboto:300i,400,500',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Roboto";',
                            '  font-style: italic;',
                            '  font-weight: 300;',
                            '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:300i) format("woff");',
                            '}',

                            '@font-face {',
                            '  font-family: "Roboto";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:400) format("woff");',
                            '}',

                            '@font-face {',
                            '  font-family: "Roboto";',
                            '  font-style: normal;',
                            '  font-weight: 500;',
                            '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:500) format("woff");',
                            '}'
                        ].join('\n')
                    }
                },

                {
                    request: 'GET https://fonts.googleapis.com/css?family=Roboto:500&text=Helo&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Roboto";',
                            '  font-style: normal;',
                            '  font-weight: 500;',
                            '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:500&text=Helo&format=woff2) format("woff2");',
                            '}'
                        ].join('\n')
                    }
                },

                {
                    request: 'GET https://fonts.googleapis.com/css?family=Roboto:400&text=Dakr&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Roboto";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Roboto"), local("Roboto-Regular"), url(https://fonts.gstatic.com/l/font?kit=Roboto:400&text=Dakr&format=woff2) format("woff2");',
                            '}'
                        ].join('\n')
                    }
                },

                {
                    request: 'GET https://fonts.googleapis.com/css?family=Roboto:300i&text=Celru&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Roboto";',
                            '  font-style: italic;',
                            '  font-weight: 300;',
                            '  src: local("Roboto Light Italic"), local("Roboto-LightItalic"), url(https://fonts.gstatic.com/l/font?kit=Roboto:300i&text=Celru&format=woff2) format("woff2");',
                            '}'
                        ].join('\n')
                    }
                },

                {
                    request: 'GET https://fonts.googleapis.com/css?family=Roboto:500&text=Helo&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Roboto";',
                            '  font-style: normal;',
                            '  font-weight: 500;',
                            '  src: local("Roboto Medium"), local("Roboto-Medium"), url(https://fonts.gstatic.com/l/font?kit=Roboto:500&text=Helo&format=woff) format("woff");',
                            '}'
                        ].join('\n')
                    }
                },

                {
                    request: 'GET https://fonts.googleapis.com/css?family=Roboto:400&text=Dakr&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Roboto";',
                            '  font-style: normal;',
                            '  font-weight: 400;',
                            '  src: local("Roboto"), local("Roboto-Regular"), url(https://fonts.gstatic.com/l/font?kit=Roboto:400&text=Dakr&format=woff) format("woff");',
                            '}'
                        ].join('\n')
                    }
                },

                {
                    request: 'GET https://fonts.googleapis.com/css?family=Roboto:300i&text=Celru&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: [
                            '@font-face {',
                            '  font-family: "Roboto";',
                            '  font-style: italic;',
                            '  font-weight: 300;',
                            '  src: local("Roboto Light Italic"), local("Roboto-LightItalic"), url(https://fonts.gstatic.com/l/font?kit=Roboto:300i&text=Celru&format=woff) format("woff");',
                            '}'
                        ].join('\n')
                    }
                },

                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:500&text=Helo&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff2'
                        },
                        body: new Buffer('Roboto:500&text=Helo&format=woff2', 'base64')
                    }
                },

                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:400&text=Dakr&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff2'
                        },
                        body: new Buffer('Roboto:400&text=Dakr&format=woff2', 'base64')
                    }
                },

                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:300i&text=Celru&format=woff2',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff2'
                        },
                        body: new Buffer('Roboto:300i&text=Celru&format=woff2', 'base64')
                    }
                },

                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:500&text=Helo&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff'
                        },
                        body: new Buffer('Roboto:500&text=Helo&format=woff', 'base64')
                    }
                },

                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:400&text=Dakr&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff'
                        },
                        body: new Buffer('Roboto:400&text=Dakr&format=woff', 'base64')
                    }
                },

                {
                    request: 'GET https://fonts.gstatic.com/l/font?kit=Roboto:300i&text=Celru&format=woff',
                    response: {
                        headers: {
                            'Content-Type': 'font/woff'
                        },
                        body: new Buffer('Roboto:300i&text=Celru&format=woff', 'base64')
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

                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                    expect(index.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Roboto-500-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Roboto-400-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Roboto-300i-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlStyle',
                            href: expect.it('to begin with', '/subfont/fonts-')
                                .and('to end with', '.css')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true,
                                isMinified: true,
                                text: expect.it('to contain', 'Roboto__subset'),
                                outgoingRelations: [
                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            extension: '.woff'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            extension: '.woff'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            extension: '.woff'
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlPrefetchLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.googleapis.com/css?family=Roboto:300i,400,500'
                        },
                        {
                            type: 'HtmlPreconnectLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.gstatic.com'
                        },
                        {
                            type: 'HtmlStyle',
                            to: {
                                isInline: true,
                                text: expect.it('to contain', 'Roboto__subset')
                            }
                        },
                        {
                            type: 'HtmlScript',
                            to: {
                                isInline: true,
                                outgoingRelations: [
                                    {
                                        type: 'JavaScriptStaticUrl',
                                        href: 'https://fonts.googleapis.com/css?family=Roboto:300i,400,500'
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            href: 'https://fonts.googleapis.com/css?family=Roboto:300i,400,500',
                            node: function (node) {
                                return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                            }
                        }
                    ]);
                });
        });

        describe('when running on multiple pages with subsetPerPage:true', function () {

            it('should have an individual subset for each page', function () {
                httpception([
                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?text=*) format(\'woff\');',
                                '}'
                            ].join('\n')
                        }
                    },
                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=abotu&format=woff2',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?text=about&format=woff2) format(\'woff2\');',
                                '}'
                            ].join('\n')
                        }
                    },
                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=ehmo&format=woff2',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?text=home&format=woff2) format(\'woff2\');',
                                '}'
                            ].join('\n')
                        }
                    },
                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=abotu&format=woff',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?text=about&format=woff) format(\'woff\');',
                                '}'
                            ].join('\n')
                        }
                    },
                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=ehmo&format=woff',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?text=home&format=woff) format(\'woff\');',
                                '}'
                            ].join('\n')
                        }
                    },
                    {
                        request: 'GET https://fonts.gstatic.com/l/font?text=about&format=woff2',
                        response: {
                            headers: {
                                'Content-Type': 'font/woff2'
                            },
                            body: new Buffer('YWJvdXQmZm9ybWF0PXdvZmYyCg==', 'base64')
                        }
                    },
                    {
                        request: 'GET https://fonts.gstatic.com/l/font?text=home&format=woff2',
                        response: {
                            headers: {
                                'Content-Type': 'font/woff2'
                            },
                            body: new Buffer('aG9tZSZmb3JtYXQ9d29mZjIK', 'base64')
                        }
                    },
                    {
                        request: 'GET https://fonts.gstatic.com/l/font?text=about&format=woff',
                        response: {
                            headers: {
                                'Content-Type': 'font/woff'
                            },
                            body: new Buffer('YWJvdXQmZm9ybWF0PXdvZmYK', 'base64')
                        }
                    },
                    {
                        request: 'GET https://fonts.gstatic.com/l/font?text=home&format=woff',
                        response: {
                            headers: {
                                'Content-Type': 'font/woff'
                            },
                            body: new Buffer('aG9tZSZmb3JtYXQ9d29mZgo=', 'base64')
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
                                    type: 'Css',
                                    url: fontCssUrlRegExp,
                                    isLoaded: true,
                                    isInline: false,
                                    isMinified: true,
                                    outgoingRelations: [
                                        {
                                            type: 'CssFontFaceSrc',
                                            hrefType: 'relative',
                                            to: {
                                                fileName: 'Open_Sans-400-0585f4b130.woff2',
                                                isLoaded: true,
                                                isInline: false
                                            }
                                        },
                                        {
                                            type: 'CssFontFaceSrc',
                                            hrefType: 'relative',
                                            to: {
                                                fileName: 'Open_Sans-400-a74a8f6457.woff',
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
                                    type: 'Css',
                                    url: fontCssUrlRegExp,
                                    isLoaded: true,
                                    isInline: false,
                                    isMinified: true,
                                    outgoingRelations: [
                                        {
                                            type: 'CssFontFaceSrc',
                                            hrefType: 'relative',
                                            to: {
                                                fileName: 'Open_Sans-400-a92122b2f9.woff2',
                                                isLoaded: true,
                                                isInline: false
                                            }
                                        },
                                        {
                                            type: 'CssFontFaceSrc',
                                            hrefType: 'relative',
                                            to: {
                                                fileName: 'Open_Sans-400-054b06c88d.woff',
                                                isLoaded: true,
                                                isInline: false
                                            }
                                        }
                                    ]
                                }
                            }
                        ]);

                        expect(index.outgoingRelations, 'to satisfy', [
                            {
                                type: 'HtmlPreloadLink',
                                hrefType: 'rootRelative',
                                href: '/subfont/Open_Sans-400-0585f4b130.woff2',
                                to: {
                                    isLoaded: true
                                },
                                as: 'font'
                            },
                            {
                                type: 'HtmlStyle',
                                href: expect.it('to begin with', '/subfont/fonts-')
                                    .and('to end with', '.css')
                                    .and('to match', /[a-z0-9]{10}/),
                                to: {
                                    isLoaded: true
                                }
                            },
                            {
                                type: 'HtmlPrefetchLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                            },
                            {
                                type: 'HtmlPreconnectLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.gstatic.com'
                            },
                            {
                                type: 'HtmlStyle',
                                to: { isInline: true }
                            },
                            {
                                type: 'HtmlAnchor',
                                href: 'about.html'
                            },
                            {
                                type: 'HtmlScript',
                                to: {
                                    isInline: true,
                                    outgoingRelations: [
                                        {
                                            type: 'JavaScriptStaticUrl',
                                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                                        }
                                    ]
                                }
                            },
                            {
                                type: 'HtmlStyle',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                                node: function (node) {
                                    return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                                }
                            }
                        ]);

                        var indexFontStyle = index.outgoingRelations[1].to;
                        var indexFont = index.outgoingRelations[0].to;

                        expect(about.outgoingRelations, 'to satisfy', [
                            {
                                type: 'HtmlPreloadLink',
                                hrefType: 'rootRelative',
                                href: '/subfont/Open_Sans-400-a92122b2f9.woff2',
                                to: expect.it('not to be', indexFont),
                                as: 'font'
                            },
                            {
                                type: 'HtmlStyle',
                                href: expect.it('to begin with', '/subfont/fonts-')
                                    .and('to end with', '.css')
                                    .and('to match', /[a-z0-9]{10}/),
                                to: expect.it('not to be', indexFontStyle)
                            },
                            {
                                type: 'HtmlPrefetchLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                            },
                            {
                                type: 'HtmlPreconnectLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.gstatic.com'
                            },
                            {
                                type: 'HtmlStyle',
                                to: { isInline: true }
                            },
                            {
                                type: 'HtmlAnchor',
                                href: 'index.html'
                            },
                            {
                                type: 'HtmlScript',
                                to: {
                                    isInline: true,
                                    outgoingRelations: [
                                        {
                                            type: 'JavaScriptStaticUrl',
                                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                                        }
                                    ]
                                }
                            },
                            {
                                type: 'HtmlStyle',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                                node: function (node) {
                                    return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
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
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?text=*) format(\'woff\');',
                                '}'
                            ].join('\n')
                        }
                    },

                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=abehmotu&format=woff2',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=abehmotu&format=woff2) format(\'woff2\');',
                                '}'
                            ].join('\n')
                        }
                    },

                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=abehmotu&format=woff',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=abehmotu&format=woff) format(\'woff\');',
                                '}'
                            ].join('\n')
                        }
                    },
                    {
                        request: 'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=abehmotu&format=woff2',
                        response: {
                            headers: {
                                'Content-Type': 'font/woff2'
                            },
                            body: new Buffer('T3BlbitTYW5zOjQwMCZ0ZXh0PWFiZWhtb3R1JmZvcm1hdD13b2ZmMgo=', 'base64')
                        }
                    },
                    {
                        request: 'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=abehmotu&format=woff',
                        response: {
                            headers: {
                                'Content-Type': 'font/woff'
                            },
                            body: new Buffer('T3BlbitTYW5zOjQwMCZ0ZXh0PWFiZWhtb3R1JmZvcm1hdD13b2ZmCg==', 'base64')
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

                        expect(index.outgoingRelations, 'to satisfy', [
                            {
                                type: 'HtmlPreloadLink',
                                hrefType: 'rootRelative',
                                href: '/subfont/Open_Sans-400-5c45d9271a.woff2',
                                to: {
                                    isLoaded: true
                                },
                                as: 'font'
                            },
                            {
                                type: 'HtmlStyle',
                                href: expect.it('to begin with', '/subfont/fonts-')
                                    .and('to end with', '.css')
                                    .and('to match', /[a-z0-9]{10}/),
                                to: {
                                    isLoaded: true,
                                    isMinified: true
                                }
                            },
                            {
                                type: 'HtmlPrefetchLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                            },
                            {
                                type: 'HtmlPreconnectLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.gstatic.com'
                            },
                            {
                                type: 'HtmlStyle',
                                to: { isInline: true }
                            },
                            {
                                type: 'HtmlAnchor',
                                href: 'about.html'
                            },
                            {
                                type: 'HtmlScript',
                                to: {
                                    isInline: true,
                                    outgoingRelations: [
                                        {
                                            type: 'JavaScriptStaticUrl',
                                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                                        }
                                    ]
                                }
                            },
                            {
                                type: 'HtmlStyle',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                                node: function (node) {
                                    return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                                }
                            }
                        ]);

                        var sharedFontStyles = index.outgoingRelations[1].to;
                        var sharedFont = index.outgoingRelations[0].to;

                        expect(about.outgoingRelations, 'to satisfy', [
                            {
                                type: 'HtmlPreloadLink',
                                hrefType: 'rootRelative',
                                href: '/subfont/Open_Sans-400-5c45d9271a.woff2',
                                to: sharedFont,
                                as: 'font'
                            },
                            {
                                type: 'HtmlStyle',
                                href: expect.it('to begin with', '/subfont/fonts-')
                                    .and('to end with', '.css')
                                    .and('to match', /[a-z0-9]{10}/),
                                to: sharedFontStyles
                            },
                            {
                                type: 'HtmlPrefetchLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                            },
                            {
                                type: 'HtmlPreconnectLink',
                                hrefType: 'absolute',
                                href: 'https://fonts.gstatic.com'
                            },
                            {
                                type: 'HtmlStyle',
                                to: { isInline: true }
                            },
                            {
                                type: 'HtmlAnchor',
                                href: 'index.html'
                            },
                            {
                                type: 'HtmlScript',
                                to: {
                                    isInline: true,
                                    outgoingRelations: [
                                        {
                                            type: 'JavaScriptStaticUrl',
                                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                                        }
                                    ]
                                }
                            },
                            {
                                type: 'HtmlStyle',
                                href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                                node: function (node) {
                                    return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                                }
                            }
                        ]);
                    });
            });
        });

        describe('fontDisplay option', function () {
            it('should not add a font-display property when no fontDisplay is defined', function () {
                httpception(defaultGoogleFontSubsetMock);

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
                        var cssAsset = assetGraph.findAssets({ type: 'Css', fileName: /fonts-/ })[0];

                        expect(cssAsset.text, 'not to contain', 'font-display');
                    });
            });

            it('should not add a font-display property when an invalid font-display value is provided', function () {
                httpception(defaultGoogleFontSubsetMock);

                return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/html-link/'})
                    .loadAssets('index.html')
                    .populate({
                        followRelations: {
                            crossorigin: false
                        }
                    })
                    .subsetGoogleFonts({
                        inlineSubsets: false,
                        fontDisplay: 'foo'
                    })
                    .queue(function (assetGraph) {
                        var cssAsset = assetGraph.findAssets({ type: 'Css', fileName: /fonts-/ })[0];

                        expect(cssAsset.text, 'not to contain', 'font-display');
                    });
            });

            it('should add a font-display property', function () {
                httpception(defaultGoogleFontSubsetMock);

                return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/html-link/'})
                    .loadAssets('index.html')
                    .populate({
                        followRelations: {
                            crossorigin: false
                        }
                    })
                    .subsetGoogleFonts({
                        inlineSubsets: false,
                        fontDisplay: 'block'
                    })
                    .queue(function (assetGraph) {
                        var cssAsset = assetGraph.findAssets({ type: 'Css', fileName: /fonts-/ })[0];

                        expect(cssAsset.text, 'to contain', '@font-face{font-display:block');
                    });
            });

            it('should update an existing font-display property', function () {
                httpception([
                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  font-display: swap;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=fake) format(\'woff\');',
                                '}'
                            ].join('\n')
                        }
                    },

                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo&format=woff2',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  font-display: swap;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff2) format(\'woff2\');',
                                '}'
                            ].join('\n')
                        }
                    },

                    {
                        request: 'GET https://fonts.googleapis.com/css?family=Open+Sans:400&text=Helo&format=woff',
                        response: {
                            headers: {
                                'Content-Type': 'text/css'
                            },
                            body: [
                                '@font-face {',
                                '  font-family: \'Open Sans\';',
                                '  font-style: normal;',
                                '  font-weight: 400;',
                                '  font-display: swap;',
                                '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff) format(\'woff\');',
                                '}'
                            ].join('\n')
                        }
                    },
                    {
                        request: 'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff2',
                        response: {
                            headers: {
                                'Content-Type': 'font/woff2'
                            },
                            body: new Buffer('helowoff2', 'base64')
                        }
                    },
                    {
                        request: 'GET https://fonts.gstatic.com/l/font?kit=Open+Sans:400&text=Helo&format=woff',
                        response: {
                            headers: {
                                'Content-Type': 'font/woff'
                            },
                            body: new Buffer('helowoff', 'base64')
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
                        inlineSubsets: false,
                        fontDisplay: 'fallback'
                    })
                    .queue(function (assetGraph) {
                        var cssAsset = assetGraph.findAssets({ type: 'Css', fileName: /fonts-/ })[0];

                        expect(cssAsset.text, 'to contain', 'font-display:fallback;');
                    });
            });
        });
    });

    describe('with fonttools installed', function () {
        it('should emit no warning about font subsetting tool not being available', function () {
            httpception();

            var warnings = [];

            return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/local-single/'})
                .on('warn', function (warning) {
                    warnings.push(warning);
                })
                .loadAssets('index.html')
                .populate({
                    followRelations: {
                        crossorigin: false
                    }
                })
                .subsetGoogleFonts({
                    inlineSubsets: false
                })
                .queue(function () {
                    expect(warnings, 'to satisfy', []);
                });
        });

        it('should emit a warning when subsetting invalid fonts', function () {
            httpception();

            var warnings = [];

            return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/local-invalid/'})
                .on('warn', function (warning) { warnings.push(warning); })
                .loadAssets('index.html')
                .populate()
                .subsetGoogleFonts({
                    inlineCss: true
                })
                .queue(function (assetGraph) {
                    expect(warnings, 'to satisfy', [
                        expect.it('to be an', Error)
                            .and('to have message', 'Not a TrueType or OpenType font')
                            .and('to satisfy', {
                                asset: expect.it('to be an', 'AssetGraph.asset')
                            }),
                        expect.it('to be an', Error)
                            .and('to have message', 'Not a TrueType or OpenType font')
                            .and('to satisfy', {
                                asset: expect.it('to be an', 'AssetGraph.asset')
                            })
                    ]);

                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                    expect(index.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: '/OpenSans.ttf',
                            to: {
                                isLoaded: true
                            },
                            as: 'font',
                            contentType: 'text/plain' // Caused by fake test data
                        },
                        {
                            type: 'HtmlStyle',
                            to: {
                                isLoaded: true,
                                isInline: true,
                                text: expect.it('to contain', 'Open Sans'),
                                outgoingRelations: [
                                    {
                                        hrefType: 'relative',
                                        href: 'OpenSans.ttf',
                                        to: {
                                            isLoaded: true
                                        }
                                    }
                                ]
                            }
                        }
                    ]);
                });
        });

        it('should subset local fonts', function () {
            httpception();

            return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/local-single/'})
                .loadAssets('index.html')
                .populate()
                .subsetGoogleFonts({
                    inlineSubsets: false
                })
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                    expect(index.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Open_Sans-400-')
                                .and('to match', /-[0-9a-f]{10}\./)
                                .and('to end with', '.woff2'),
                            to: {
                                isLoaded: true
                            },
                            as: 'font',
                            contentType: 'font/woff2'
                        },
                        {
                            type: 'HtmlStyle',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/fonts-')
                                .and('to match', /-[0-9a-f]{10}\./)
                                .and('to end with', '.css'),
                            to: {
                                isLoaded: true,
                                isInline: false,
                                text: expect.it('to contain', 'Open Sans__subset'),
                                outgoingRelations: [
                                    {
                                        hrefType: 'relative',
                                        href: expect.it('to begin with', 'Open_Sans-400-')
                                            .and('to match', /-[0-9a-f]{10}\./)
                                            .and('to end with', '.woff2'),
                                        to: {
                                            isLoaded: true
                                        }
                                    },
                                    {
                                        hrefType: 'relative',
                                        href: expect.it('to begin with', 'Open_Sans-400-')
                                            .and('to match', /-[0-9a-f]{10}\./)
                                            .and('to end with', '.woff'),
                                        to: {
                                            isLoaded: true
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            to: {
                                isLoaded: true,
                                isInline: true,
                                text: expect.it('to contain', 'Open Sans'),
                                outgoingRelations: [
                                    {
                                        hrefType: 'relative',
                                        href: 'OpenSans.ttf',
                                        to: {
                                            isLoaded: true
                                        }
                                    }
                                ]
                            }
                        }
                    ]);
                });
        });

        it('should handle HTML <link rel=stylesheet> with Google Fonts', function () {
            httpception(defaultLocalSubsetMock);

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
                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                    expect(index.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Open_Sans-400-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlStyle',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/fonts-')
                                .and('to end with', '.css')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true,
                                isMinified: true,
                                text: expect.it('to contain', 'Open Sans__subset'),
                                outgoingRelations: [
                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            extension: '.woff'
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlPrefetchLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                        },
                        {
                            type: 'HtmlPreconnectLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.gstatic.com'
                        },
                        {
                            type: 'HtmlStyle',
                            to: {
                                isInline: true,
                                text: expect.it('to contain', 'Open Sans__subset')
                            }
                        },
                        {
                            type: 'HtmlScript',
                            to: {
                                isInline: true,
                                outgoingRelations: [
                                    {
                                        type: 'JavaScriptStaticUrl',
                                        href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                            node: function (node) {
                                return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                            }
                        }
                    ]);
                });
        });

        it('should handle mixed local fonts and Google fonts', function () {
            httpception(defaultLocalSubsetMock);

            return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/local-mixed/'})
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
                    expect(assetGraph, 'to contain asset', { fileName: 'index.html' });

                    var index = assetGraph.findAssets({ fileName: 'index.html' })[0];

                    expect(index.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Local_Sans-400-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/Open_Sans-400-')
                                .and('to end with', '.woff2')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true
                            },
                            as: 'font'
                        },
                        {
                            type: 'HtmlStyle',
                            hrefType: 'rootRelative',
                            href: expect.it('to begin with', '/subfont/fonts-')
                                .and('to end with', '.css')
                                .and('to match', /[a-z0-9]{10}/),
                            to: {
                                isLoaded: true,
                                isMinified: true,
                                text: expect.it('to contain', 'Open Sans__subset')
                                    .and('to contain', 'Local Sans__subset'),
                                outgoingRelations: [
                                    {
                                        type: 'CssFontFaceSrc',
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            fileName: expect.it('to begin with', 'Local_Sans-400-'),
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        type: 'CssFontFaceSrc',
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            fileName: expect.it('to begin with', 'Local_Sans-400-'),
                                            extension: '.woff'
                                        }
                                    },

                                    {
                                        type: 'CssFontFaceSrc',
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff2',
                                            fileName: expect.it('to begin with', 'Open_Sans-400-'),
                                            extension: '.woff2'
                                        }
                                    },

                                    {
                                        type: 'CssFontFaceSrc',
                                        hrefType: 'relative',
                                        to: {
                                            contentType: 'font/woff',
                                            fileName: expect.it('to begin with', 'Open_Sans-400-'),
                                            extension: '.woff'
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlPrefetchLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                        },
                        {
                            type: 'HtmlPreconnectLink',
                            hrefType: 'absolute',
                            href: 'https://fonts.gstatic.com'
                        },
                        {
                            type: 'HtmlStyle',
                            to: {
                                isInline: true,
                                text: expect.it('to contain', 'Open Sans__subset')
                                    .and('to contain', 'Local Sans__subset')
                            }
                        },
                        {
                            type: 'HtmlScript',
                            to: {
                                isInline: true,
                                outgoingRelations: [
                                    {
                                        type: 'JavaScriptStaticUrl',
                                        href: 'https://fonts.googleapis.com/css?family=Open+Sans'
                                    }
                                ]
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            href: 'https://fonts.googleapis.com/css?family=Open+Sans',
                            node: function (node) {
                                return expect(node.parentNode.tagName, 'to be', 'NOSCRIPT');
                            }
                        }
                    ]);
                });
        });
    });

});

