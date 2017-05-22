/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

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
