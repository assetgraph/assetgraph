var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    passError = require('passerror'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;

describe('Html', function () {
    it('should handle a test case with a javascript: url', function (done) {
        new AssetGraph({root: __dirname + '/Html/javascriptUrl/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain relation', 'HtmlAnchor');
                expect(assetGraph, 'to contain asset', 'JavaScript');

                var javaScript = assetGraph.findAssets({type: 'JavaScript', isInline: true})[0];
                javaScript.parseTree.body.push(new uglifyJs.AST_SimpleStatement({
                    body: new uglifyJs.AST_Call({
                        expression: new uglifyJs.AST_SymbolRef({name: 'alert'}),
                        args: [new uglifyJs.AST_String({value: 'bar'})]
                    })
                }));
                javaScript.markDirty();

                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /bar/);
            })
            .run(done);
    });

    describe('#text', function () {
        it('should get text of asset instantiated with rawSrc property', function () {
            expect(new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            }).text, 'to equal', '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        });

        it('should get text of AssetGraph.Html with rawSrcProxy', function (done) {
            var asset = new AssetGraph.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            asset.load(passError(done, function () {
                expect(asset.text, 'to equal', '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
                done();
            }));
        });

        it('should get text of AssetGraph.Html instantiated with text property', function () {
            expect(new AssetGraph.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            }).text, 'to equal', '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        });

        it('should get text of AssetGraph.Html instantiated with rawSrc property and modified parse tree', function () {
            var htmlAsset = new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            expect(htmlAsset.text, 'to equal', '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        });

        it('should get text of AssetGraph.Html with rawSrcProxy and modified parse tree', function (done) {
            var htmlAsset = new AssetGraph.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            htmlAsset.load(passError(done, function () {
                htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
                htmlAsset.markDirty();
                expect(htmlAsset.text, 'to equal', '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
                done();
            }));
        });

        it('should get text of AssetGraph.Html with text property and modified parse tree', function () {
            var htmlAsset = new AssetGraph.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            expect(htmlAsset.text, 'to equal', '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        });
    });

    describe('#rawSrc', function () {
        it('should get rawSrc of AssetGraph.Html with rawSrc property', function () {
            expect(new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            }).rawSrc, 'to equal', new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>', 'utf-8'));
        });

        it('should get rawSrc of AssetGraph.Html with rawSrcProxy', function (done) {
            var asset = new AssetGraph.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            asset.load(passError(done, function () {
                expect(asset.rawSrc, 'to equal', new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>', 'utf-8'));
                done();
            }));
        });

        it('should get rawSrc of AssetGraph.Html instantiated with text property', function () {
            expect(new AssetGraph.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            }).rawSrc, 'to equal', new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>', 'utf-8'));
        });

        it('should get rawSrc of AssetGraph.Html with rawSrc property and modified parse tree', function () {
            var htmlAsset = new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            expect(htmlAsset.rawSrc, 'to equal', new Buffer('<!DOCTYPE html>\n<html><body>Not so much!</body></html>', 'utf-8'));
        });

        it('should get rawSrc of AssetGraph.Html with rawSrcProxy and modified parse tree', function (done) {
            var htmlAsset = new AssetGraph.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            htmlAsset.load(passError(done, function () {
                htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
                htmlAsset.markDirty();
                expect(htmlAsset.rawSrc, 'to equal', new Buffer('<!DOCTYPE html>\n<html><body>Not so much!</body></html>', 'utf-8'));
                done();
            }));
        });

        it('should get rawSrc of AssetGraph.Html with text property and modified parse tree', function () {
            var htmlAsset = new AssetGraph.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            expect(htmlAsset.rawSrc, 'to equal', new Buffer('<!DOCTYPE html>\n<html><body>Not so much!</body></html>', 'utf-8'));
        });
    });
});
