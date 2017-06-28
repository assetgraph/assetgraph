/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlStyle', function () {
    var htmlAsset;
    var relationToInject;
    var assetGraph;
    beforeEach(function () {
        assetGraph = new AssetGraph({root: __dirname});
        var cssAsset = new AssetGraph.Css({
            url: assetGraph.root + 'injected.css',
            text: 'div{color:red}'
        });
        assetGraph.addAsset(cssAsset);
        relationToInject = new AssetGraph.HtmlStyle({from: htmlAsset, to: cssAsset});
    });

    function initial(html) {
        htmlAsset = new AssetGraph.Html({
            url: assetGraph.root + 'index.html',
            text: html
        });
        assetGraph.addAsset(htmlAsset);
    }

    describe('#media', function () {
        describe('invoked as a getter', function () {
            it('should retrieve the trimmed media attribute', function () {
                initial('<!DOCTYPE html><html><head><style media=" projection screen ">body{color:#000};</style></head><body></body></html>');
                expect(assetGraph.findRelations({type: 'HtmlStyle'})[0].media, 'to equal', 'projection screen');
            });
        });

        describe('invoked as a setter', function () {
            it('should trim and update the media attribute', function () {
                initial('<!DOCTYPE html><html><head><style>body{color:#000};</style></head><body></body></html>');
                assetGraph.findRelations({type: 'HtmlStyle'})[0].media = ' projection screen ';
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain', '<style media="projection screen">');
            });

            it('should remove media attribute when set to a falsy value', function () {
                initial('<!DOCTYPE html><html><head><style media="projection">body{color:#000};</style></head><body></body></html>');
                assetGraph.findRelations({type: 'HtmlStyle'})[0].media = undefined;
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain', '<style>');
            });
        });
    });

    describe('#attach', function () {
        describe('when there are existing HtmlStyle relations in <head>', function () {
            beforeEach(function () {
                initial('<!DOCTYPE html><html><head><style>body{color:#000};</style><style>body{color:#111};</style></head><body></body></html>');
            });

            describe('with position=first', function () {
                it('should attach the relation before the first HtmlStyle in <head>', function () {
                    relationToInject.attach(htmlAsset, 'first');
                    expect(htmlAsset.text, 'to contain', '<link rel="stylesheet" href="injected.css"><style>body{color:#000};</style>');
                });
            });

            describe('with position=last', function () {
                it('should attach the relation after the last HtmlStyle in <head>', function () {
                    relationToInject.attach(htmlAsset, 'last');
                    expect(htmlAsset.text, 'to contain', '<style>body{color:#111};</style><link rel="stylesheet" href="injected.css">');
                });
            });
        });

        describe('when there are existing HtmlStyle relations in <head> and <body>', function () {
            beforeEach(function () {
                initial('<!DOCTYPE html><html><head><style>body{color:#000};</style><style>body{color:#111};</style></head><body><style>body{color:#222};</style><style>body{color:#333};</style></body></html>');
            });

            describe('with position=first', function () {
                it('should attach the relation before the first HtmlStyle in <head>', function () {
                    relationToInject.attach(htmlAsset, 'first');
                    expect(htmlAsset.text, 'to contain', '<link rel="stylesheet" href="injected.css"><style>body{color:#000};</style>');
                });
            });

            describe('with position=last', function () {
                it('should attach the relation after the last HtmlStyle in <body>', function () {
                    relationToInject.attach(htmlAsset, 'last');
                    expect(htmlAsset.text, 'to contain', '<style>body{color:#333};</style><link rel="stylesheet" href="injected.css">');
                });
            });
        });

        describe('when there are existing HtmlStyle relations in <body>', function () {
            beforeEach(function () {
                initial('<!DOCTYPE html><html><head></head><body><style>body{color:#222};</style><style>body{color:#333};</style></body></html>');
            });

            describe('with position=first', function () {
                it('should attach the relation before the first HtmlStyle in <body>', function () {
                    relationToInject.attach(htmlAsset, 'first');
                    expect(htmlAsset.text, 'to contain', '<link rel="stylesheet" href="injected.css"><style>body{color:#222};</style>');
                });
            });

            describe('with position=last', function () {
                it('should attach the relation after the last HtmlStyle in <body>', function () {
                    relationToInject.attach(htmlAsset, 'last');
                    expect(htmlAsset.text, 'to contain', '<style>body{color:#333};</style><link rel="stylesheet" href="injected.css">');
                });
            });
        });

        describe('when there are no existing HtmlStyle relations', function () {
            beforeEach(function () {
                initial('<!DOCTYPE html><html><head><meta foo="bar"></head><body></body></html>');
            });

            describe('with position=first', function () {
                it('should attach the relation to the end of <head>', function () {
                    relationToInject.attach(htmlAsset, 'first');
                    expect(htmlAsset.text, 'to contain', '<meta foo="bar"><link rel="stylesheet" href="injected.css">');
                });
            });

            describe('with position=last', function () {
                it('should attach the relation to the end of <head>', function () {
                    relationToInject.attach(htmlAsset, 'last');
                    expect(htmlAsset.text, 'to contain', '<meta foo="bar"><link rel="stylesheet" href="injected.css">');
                });
            });
        });
    });
});
