var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    assets = AssetGraph.assets,
    query = AssetGraph.query;

vows.describe('assets.Text').addBatch({
    'get text of assets.Text with rawSrc property': {
        topic: function () {
            return new assets.Text({
                rawSrc: new Buffer('Hello, world!\u263a')
            }).text;
        },
        'should return the right value': function (text) {
            assert.equal(text, 'Hello, world!\u263a');
        }
    },

    'get text of assets.Text with rawSrcProxy': {
        topic: function () {
            var callback = this.callback,
                asset = new assets.Text({
                    rawSrcProxy: function (cb) {
                        process.nextTick(function () {
                            cb(null, new Buffer('Hello, world!\u263a'));
                        });
                    }
                });
            asset.load(function (err) {
                callback(err, !err && asset.text);
            });
        },
        'should return the right value': function (text) {
            assert.equal(text, 'Hello, world!\u263a');
        }
    },

    'get text of assets.Text with text property': {
        topic: function () {
            return new assets.Text({
                text: 'Hello, world!\u263a'
            }).text;
        },
        'should return the right value': function (text) {
            assert.equal(text, 'Hello, world!\u263a');
        }
    },

    'get rawSrc of assets.Text with rawSrc property': {
        topic: function () {
            return new assets.Text({
                rawSrc: new Buffer('Hello, world!\u263a')
            }).rawSrc;
        },
        'should return the right value': function (rawSrc) {
            assert.equal(rawSrc.toString('utf-8'), 'Hello, world!\u263a');
        }
    },

    'get rawSrc of assets.Text with rawSrcProxy': {
        topic: function () {
            var callback = this.callback,
                asset = new assets.Text({
                    rawSrcProxy: function (cb) {
                        process.nextTick(function () {
                            cb(null, new Buffer('Hello, world!\u263a'));
                        });
                    }
                });
            asset.load(function (err) {
                callback(err, !err && asset.rawSrc);
            });
        },
        'should return the right value': function (rawSrc) {
            assert.equal(rawSrc.toString('utf-8'), 'Hello, world!\u263a');
        }
    },

    'get rawSrc of assets.Text with text property': {
        topic: function () {
            return new assets.Text({
                text: 'Hello, world!\u263a'
            }).rawSrc;
        },
        'should return the right value': function (rawSrc) {
            assert.equal(rawSrc.toString('utf-8'), 'Hello, world!\u263a');
        }
    },

    'get text of assets.Html with rawSrc property': {
        topic: function () {
            return new assets.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            }).text;
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get text of assets.Html with rawSrcProxy': {
        topic: function () {
            var callback = this.callback,
                asset = new assets.Html({
                    rawSrcProxy: function (cb) {
                        process.nextTick(function () {
                            cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                        });
                    }
                });
            asset.load(function (err) {
                callback(err, !err && asset.text);
            });
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get text of assets.Html with text property': {
        topic: function () {
            return new assets.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            }).text;
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get rawSrc of assets.Html with rawSrc property': {
        topic: function () {
            return new assets.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            }).rawSrc;
        },
        'should return the right value': function (rawSrc) {
            assert.equal(rawSrc.toString('utf-8'), '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get rawSrc of assets.Html with rawSrcProxy': {
        topic: function () {
            var callback = this.callback,
                asset = new assets.Html({
                    rawSrcProxy: function (cb) {
                        process.nextTick(function () {
                            cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                        });
                    }
                });
            asset.load(function (err) {
                callback(err, !err && asset.rawSrc);
            });
        },
        'should return the right value': function (rawSrc) {
            assert.equal(rawSrc.toString('utf-8'), '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get rawSrc of assets.Html with text property': {
        topic: function () {
            return new assets.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            }).rawSrc;
        },
        'should return the right value': function (rawSrc) {
            assert.equal(rawSrc.toString('utf-8'), '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get text of assets.Html with rawSrc property and modified parse tree': {
        topic: function () {
            var htmlAsset = new assets.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            return htmlAsset.text;
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get text of assets.Html with rawSrcProxy and modified parse tree': {
        topic: function () {
            var htmlAsset = new assets.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            var callback = this.callback;
            htmlAsset.load(function (err) {
                if (err) {
                    return callback(err);
                }
                htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
                htmlAsset.markDirty();
                callback(null, htmlAsset.text);
            });
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get text of assets.Html with text property and modified parse tree': {
        topic: function () {
            var htmlAsset = new assets.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            return htmlAsset.text;
        },
        'should return the right value': function (text) {
            assert.equal(text, '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get rawSrc of assets.Html with rawSrc property and modified parse tree': {
        topic: function () {
            var htmlAsset = new assets.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            return htmlAsset.rawSrc;
        },
        'should return the right value': function (rawSrc) {
            assert.equal(rawSrc.toString('utf-8'), '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get rawSrc of assets.Html with rawSrcProxy and modified parse tree': {
        topic: function () {
            var htmlAsset = new assets.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            var callback = this.callback;
            htmlAsset.load(function (err) {
                if (err) {
                    return callback(err);
                }
                htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
                htmlAsset.markDirty();
                callback(null, htmlAsset.rawSrc);
            });
        },
        'should return the right value': function (rawSrc) {
            assert.equal(rawSrc.toString('utf-8'), '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get rawSrc of assets.Html with text property and modified parse tree': {
        topic: function () {
            var htmlAsset = new assets.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            return htmlAsset.rawSrc;
        },
        'should return the right value': function (rawSrc) {
            assert.equal(rawSrc.toString('utf-8'), '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    }
})['export'](module);
