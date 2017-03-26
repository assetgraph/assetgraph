var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib');

var httpception = require('httpception');

describe('transforms/subsetGoogleFonts', function () {

    it('should replace the full google font with the subset', function () {
        httpception([
            {
                request: 'GET http://fonts.googleapis.com/css?family=Open+Sans',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: [
                        '@font-face {',
                        '  font-family: \'Open Sans\';',
                        '  font-style: normal;',
                        '  font-weight: 400;',
                        '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(http://fonts.gstatic.com/s/opensans/v13/cJZKeOuBrn4kERxqtaUH3aCWcynf_cDxXwCLxiixG1c.ttf) format(\'truetype\');',
                        '}'
                    ].join('\n')
                }
            },
            {
                request: 'GET http://fonts.googleapis.com/css?family=Open+Sans&text=Helo',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body:
                        "@font-face {\n" +
                        "  font-family: 'Open Sans';\n" +
                        "  font-style: normal;\n" +
                        "  font-weight: 400;\n" +
                        "  src: local('Open Sans'), local('OpenSans'), url(http://fonts.gstatic.com/l/font?kit=hG1DT3NOdnKcUMCexTjsHnY_vlID40_xbxWXk1HqQcs&skey=62c1cbfccc78b4b2&v=v13) format('truetype');\n" +
                        "}"
                }
            },
            {
                request: 'GET http://fonts.gstatic.com/l/font?kit=hG1DT3NOdnKcUMCexTjsHnY_vlID40_xbxWXk1HqQcs&skey=62c1cbfccc78b4b2&v=v13',
                response: {
                    headers: {
                        'Content-Type': 'font/ttf'
                    },
                    body: new Buffer('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', 'base64')
                }
            }
        ]);

        return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetGoogleFonts/'})
            .loadAssets('index.html')
            .populate({
                followRelations: {
                    crossorigin: false
                }
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation including unresolved', {
                    type: 'HtmlStyle',
                    to: {
                        url: 'http://fonts.googleapis.com/css?family=Open+Sans'
                    }
                });
            })
            .subsetGoogleFonts()
            .queue(function (assetGraph) {

                expect(assetGraph, 'to contain relation', {
                    type: 'HtmlStyle',
                    to: {
                        url: 'http://fonts.googleapis.com/css?family=Open+Sans&text=Helo',
                        isLoaded: true
                    }
                });
            });
    });
});

