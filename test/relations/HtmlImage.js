/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlImage', function () {
    let assetGraph;
    let htmlAsset;
    beforeEach(function () {
        assetGraph = new AssetGraph({ root: __dirname });
    });

    function initial(html) {
        htmlAsset = assetGraph.addAsset({
            type: 'Html',
            url: assetGraph.root + 'index.html',
            text: html
        });
    }

    describe('#decoding', function () {
        describe('invoked as a getter', function () {
            it('should retrieve the trimmed, lower cased decoding attribute', function () {
                initial('<!DOCTYPE html><html><body><img src="foo.png" decoding=" ASYNC "></body></html>');
                expect(
                    assetGraph.findRelations({ type: 'HtmlImage' })[0].decoding,
                    'to equal',
                    'async'
                );
            });
        });

        describe('invoked as a setter', function () {
            it('should trim, lower case and update the decoding attribute', function () {
                initial('<!DOCTYPE html><html><body><img src="foo.png"></body></html>');
                assetGraph.findRelations({ type: 'HtmlImage' })[0].decoding = ' ASYNC ';
                expect(
                    assetGraph.findAssets({ type: 'Html' })[0].text,
                    'to contain',
                    '<img src="foo.png" decoding="async">'
                );
            });

            it('should remove decoding attribute when set to a falsy value', function () {
                initial('<!DOCTYPE html><html><body><img src="foo.png" decoding="async"></body></html>');
                assetGraph.findRelations({ type: 'HtmlImage' })[0].decoding = undefined;
                expect(
                    assetGraph.findAssets({ type: 'Html' })[0].text,
                    'to contain',
                    '<img src="foo.png">'
                );
            });
        });
    });

    describe('#attach', function () {
        it('should support the decoding property when adding an HtmlImage relation', function () {
            initial('<!DOCTYPE html><html><head></head><body></body></html>');
            htmlAsset.addRelation({
                type: 'HtmlImage',
                decoding: ' ASYNC ',
                to: 'https://example.com/foo.png'
            }, 'first');

            expect(
                htmlAsset.text,
                'to contain',
                '<img decoding="async" src="https://example.com/foo.png">'
            );
        });
    });

    describe('#detach', function () {
        it('should store the decoding attribute and use it when reattaching', function () {
            initial('<!DOCTYPE html><html><body><img src="foo.png" decoding="async"></body></html>');
            const htmlImage = htmlAsset.outgoingRelations[0];
            expect(htmlImage._decoding, 'to be undefined');
            htmlImage.detach();
            expect(htmlImage._decoding, 'to equal', 'async');
            expect(htmlImage.decoding, 'to equal', 'async');
            htmlImage.attach('first');
            expect(htmlImage._decoding, 'to be undefined');
            expect(htmlImage.decoding, 'to equal', 'async');
        });
    });
});
