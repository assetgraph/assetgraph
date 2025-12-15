/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/importExternalAssets', function () {
    it('should populate external assets and move them into the assetGraph root', function () {
        return expect(function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/importExternalAssets/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: {
                        crossorigin: false
                    }
                })
                .queue(function setup(assetGraph) {
                    expect(assetGraph.findRelations({}, true), 'to satisfy', [
                        {
                            type: 'HtmlScript',
                            href: '//cdnjs.cloudflare.com/ajax/libs/jquery/1.11.0/jquery.js',
                            to: {
                                text: undefined
                            }
                        },
                        {
                            type: 'HtmlScript',
                            href: '//ajax.googleapis.com/ajax/libs/angularjs/1.3.2/angular.js',
                            to: {
                                text: undefined
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            href: 'http://yui.yahooapis.com/pure/0.5.0/base-min.css',
                            to: {
                                text: undefined
                            }
                        },
                        {
                            type: 'HtmlAnchor',
                            href: 'http://fisk.dk',
                            to: {
                                text: undefined
                            }
                        }
                    ]);
                })
                .importExternalAssets()
                .queue(function verification(assetGraph) {
                    expect(assetGraph.findRelations({}, true), 'to satisfy', [
                        {
                            type: 'HtmlScript',
                            hrefType: 'rootRelative',
                            href: /external-imports\/jquery-\d+.js$/,
                            to: {
                                text: 'I am jquery',
                                url: /external-imports\/jquery-\d+.js$/
                            }
                        },
                        {
                            type: 'HtmlScript',
                            hrefType: 'rootRelative',
                            href: /external-imports\/angular-\d+\.js$/,
                            to: {
                                text: 'I am angular',
                                url: /external-imports\/angular-\d+\.js/
                            }
                        },
                        {
                            type: 'HtmlStyle',
                            hrefType: 'rootRelative',
                            href: /external-imports\/base-min-\d+.css$/,
                            to: {
                                text: 'I am YUI Pure base-min',
                                url: /external-imports\/base-min-\d+.css$/
                            }
                        },
                        {
                            type: 'HtmlAnchor',
                            href: 'http://fisk.dk',
                            to: {
                                text: undefined
                            }
                        }
                    ]);
                });
        }, 'with http mocked out', [
            {
                request: 'GET http://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.0/jquery.js',
                response: {
                    body: 'I am jquery'
                }
            },
            {
                request: 'GET http://ajax.googleapis.com/ajax/libs/angularjs/1.3.2/angular.js',
                response: {
                    body: 'I am angular'
                }
            },
            {
                request: 'GET http://yui.yahooapis.com/pure/0.5.0/base-min.css',
                response: {
                    body: 'I am YUI Pure base-min'
                }
            }
        ], 'not to error');
    });

    it('should honor options.importPath', function () {
        return expect(function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/importExternalAssets/'})
                .loadAssets('basic.html')
                .populate({
                    followRelations: {
                        crossorigin: false
                    }
                })
                .queue(function setup(assetGraph) {
                    expect(assetGraph.findRelations({}, true), 'to satisfy', [
                        {
                            type: 'HtmlStyle',
                            href: 'http://fisk.dk/basic.css',
                            to: {
                                text: undefined
                            }
                        }
                    ]);
                })
                .importExternalAssets({
                    importPath: 'iAmUserDefined'
                })
                .queue(function verification(assetGraph) {
                    expect(assetGraph.findRelations({}, true), 'to satisfy', [
                        {
                            type: 'HtmlStyle',
                            hrefType: 'rootRelative',
                            href: /iAmUserDefined\/basic-\d+.css$/,
                            to: {
                                text: 'h1 { background: red; }',
                                url: /iAmUserDefined\/basic-\d+.css$/
                            }
                        }
                    ]);
                });
        }, 'with http mocked out', [
            {
                request: 'GET http://fisk.dk/basic.css',
                response: {
                    body: 'h1 { background: red; }'
                }
            }
        ], 'not to error');
    });

    it('should keep assets not targeted by the populationQuery external', function () {
        return expect(function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/importExternalAssets/'})
                .loadAssets('onlyCss.html')
                .populate({
                    followRelations: {
                        crossorigin: false
                    }
                })
                .queue(function setup(assetGraph) {
                    expect(assetGraph.findRelations({}, true), 'to satisfy', [
                        {
                            type: 'HtmlStyle',
                            href: 'http://fisk.dk/withBackgroundImages.css',
                            to: {
                                text: undefined
                            }
                        }
                    ]);
                })
                .importExternalAssets({
                    populationQuery: {
                        followRelations: { type: 'HtmlStyle' }
                    }
                })
                .queue(function verification(assetGraph) {
                    expect(assetGraph.findRelations({}, true), 'to satisfy', [
                        {
                            type: 'HtmlStyle',
                            hrefType: 'rootRelative',
                            href: /external-imports\/withBackgroundImages-\d+.css$/,
                            to: {
                                text: 'h1 { background-image: url(\'http://fisk.dk/foo.jpg\'); }',
                                url: /external-imports\/withBackgroundImages-\d+.css$/
                            }
                        },
                        {
                            type: 'CssImage',
                            href: 'http://fisk.dk/foo.jpg',
                            to: {
                                url: 'http://fisk.dk/foo.jpg'
                            }
                        }
                    ]);
                });
        }, 'with http mocked out', [
            {
                request: 'GET http://fisk.dk/withBackgroundImages.css',
                response: {
                    body: 'h1 { background-image: url(foo.jpg); }'
                }
            }
        ], 'not to error');
    });
});
