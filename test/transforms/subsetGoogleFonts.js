var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib');

var httpception = require('httpception');

describe('transforms/subsetGoogleFonts', function () {

    it('should replace the full google font with the subset', function () {
        httpception([
            {
                request: 'GET http://fonts.googleapis.com/css?family=Open+Sans',
                response: {
                    contentType: 'text/css',
                    body: [
                        '@font-face {',
                        '  font-family: \'Open Sans\';',
                        '  font-style: normal;',
                        '  font-weight: 400;',
                        '  src: local(\'Open Sans\'), local(\'OpenSans\'), url(http://fonts.gstatic.com/s/opensans/v13/cJZKeOuBrn4kERxqtaUH3aCWcynf_cDxXwCLxiixG1c.ttf) format(\'truetype\');',
                        '}'
                    ].join('\n')
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
                        isLoaded: false
                    }
                });
            });
    });
});

