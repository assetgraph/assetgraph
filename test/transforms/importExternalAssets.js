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
});
