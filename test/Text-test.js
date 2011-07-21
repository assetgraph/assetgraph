var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    assets = AssetGraph.assets,
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('assets.Text').addBatch({
    'getText() on assets.Text with rawSrcProxy': {
        topic: function () {
            new assets.Text({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('Hello, world!\u263a'));
                    });
                }
            }).getText(this.callback);
        },
        'should return the right value': function (text) {
            assert.equal(text, 'Hello, world!\u263a');
        }
    },

    'getText() on assets.Text with text property': {
        topic: function () {
            new assets.Text({
                text: 'Hello, world!\u263a'
            }).getText(this.callback);
        },
        'should return the right value': function (text) {
            assert.equal(text, 'Hello, world!\u263a');
        }
    },

    'getText() on assets.Html with rawSrcProxy': {
        topic: function () {
            new assets.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            }).getText(this.callback);
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

   'getText() on assets.Html with text property': {
        topic: function () {
            new assets.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            }).getText(this.callback);
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'getText() on assets.Html with rawSrcProxy and modified parse tree': {
        topic: function () {
            var htmlAsset = new assets.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            var callback = this.callback;
            htmlAsset.getParseTree(function (err, parseTree) {
                if (err) {
                    return callback(err);
                }
                parseTree.body.firstChild.nodeValue = 'Not so much!';
                htmlAsset.markDirty();
                htmlAsset.getText(callback);
            });
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'getText() on assets.Html with text property and modified parse tree': {
        topic: function () {
            var htmlAsset = new assets.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            });
            var callback = this.callback;
            htmlAsset.getParseTree(function (err, parseTree) {
                if (err) {
                    return callback(err);
                }
                parseTree.body.firstChild.nodeValue = 'Not so much!';
                htmlAsset.markDirty();
                htmlAsset.getText(callback);
            });
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    }
})['export'](module);
