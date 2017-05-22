/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('assets/ContentSecurityPolicy', function () {
    it('should handle a test case with existing Content-Security-Policy meta tags', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/ContentSecurityPolicy/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain assets', 'ContentSecurityPolicy', 2);

                expect(assetGraph, 'to contain relations', 'HtmlContentSecurityPolicy', 2);

                var contentSecurityPolicies = assetGraph.findAssets({type: 'ContentSecurityPolicy'});
                expect(contentSecurityPolicies[0].parseTree, 'to equal', {
                    defaultSrc: ['\'self\''],
                    styleSrc: ['\'unsafe-inline\''],
                    reportUri: ['http://example.com/tellyouwhat'],
                    foobarquux: []
                });

                expect(contentSecurityPolicies[1].parseTree, 'to equal', {
                    defaultSrc: ['\'self\''],
                    reportUri: ['http://example.com/gossip']
                });

                contentSecurityPolicies[0].parseTree.reportUri = ['http://somewhereelse.com/tellyouwhat'];
                contentSecurityPolicies[0].markDirty();

                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain', 'report-uri http://somewhereelse.com/tellyouwhat');
            })
            .run(done);
    });

    it('should normalize the casing of directives, hash names and single quoted directives', function () {
        expect(new AssetGraph.ContentSecurityPolicy({
            text: 'DEFAULT-sRc \'seLF\' \'sHa256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs=\' HttP://foo.com dAta: sVn+SSH: \'UNsafe-InLiNe\' \'unSAFE-eVal\' \'nONCe-ABC123\''
        }).parseTree, 'to exhaustively satisfy', {
            defaultSrc: ['\'self\'', '\'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs=\'', 'http://foo.com', 'data:', 'svn+ssh:', '\'unsafe-inline\'', '\'unsafe-eval\'', '\'nonce-ABC123\'']
        });
    });

    // Doesn't seem to permitted by the grammar, but is used by eg. https://report-uri.io/home/generate
    it('should allow a trailing semicolon', function () {
        expect(new AssetGraph.ContentSecurityPolicy({
            text: 'default-src \'self\';'
        }).parseTree, 'to exhaustively satisfy', {
            defaultSrc: ['\'self\'']
        });
    });

    it('should support \"boolean\" directives', function () {
        var contentSecurityPolicy = new AssetGraph.ContentSecurityPolicy({
            text: 'upgrade-insecure-requests; block-all-mixed-content'
        });
        expect(contentSecurityPolicy.parseTree, 'to exhaustively satisfy', {
            upgradeInsecureRequests: [],
            blockAllMixedContent: []
        });
        contentSecurityPolicy.markDirty();
        expect(contentSecurityPolicy.text, 'to equal', 'upgrade-insecure-requests; block-all-mixed-content');
    });

    it('should tolerate leading newlines', function () {
        var csp = new AssetGraph.ContentSecurityPolicy({
            text: "\n     default-src 'self'; img-src 'self'"
        });
        expect(csp.parseTree, 'to satisfy', {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'"]
        });
        csp.markDirty();
        expect(csp.text, 'to equal', "default-src 'self'; img-src 'self'");
    });
});
