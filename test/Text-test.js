var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('Text').addBatch({
    'get text of Text asset with rawSrc property': {
        topic: function () {
            return new AssetGraph.Text({
                rawSrc: new Buffer('Hello, world!\u263a')
            }).text;
        },
        'should return the right value': function (text) {
            expect(text, 'to equal', 'Hello, world!\u263a');
        }
    },

    'get text of AssetGraph.Text with rawSrcProxy': {
        topic: function () {
            var callback = this.callback,
                asset = new AssetGraph.Text({
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
            expect(text, 'to equal', 'Hello, world!\u263a');
        }
    },

    'get text of AssetGraph.Text with text property': {
        topic: function () {
            return new AssetGraph.Text({
                text: 'Hello, world!\u263a'
            }).text;
        },
        'should return the right value': function (text) {
            expect(text, 'to equal', 'Hello, world!\u263a');
        }
    },

    'get rawSrc of AssetGraph.Text with rawSrc property': {
        topic: function () {
            return new AssetGraph.Text({
                rawSrc: new Buffer('Hello, world!\u263a')
            }).rawSrc;
        },
        'should return the right value': function (rawSrc) {
            expect(rawSrc.toString('utf-8'), 'to equal', 'Hello, world!\u263a');
        }
    },

    'get rawSrc of AssetGraph.Text with rawSrcProxy': {
        topic: function () {
            var callback = this.callback,
                asset = new AssetGraph.Text({
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
            expect(rawSrc.toString('utf-8'), 'to equal', 'Hello, world!\u263a');
        }
    },

    'get rawSrc of AssetGraph.Text with text property': {
        topic: function () {
            return new AssetGraph.Text({
                text: 'Hello, world!\u263a'
            }).rawSrc;
        },
        'should return the right value': function (rawSrc) {
            expect(rawSrc.toString('utf-8'), 'to equal', 'Hello, world!\u263a');
        }
    },

    'get text of AssetGraph.Html with rawSrc property': {
        topic: function () {
            return new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            }).text;
        },
        'should return the right value': function (text) {
            expect(text, 'to equal', '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get text of AssetGraph.Html with rawSrcProxy': {
        topic: function () {
            var callback = this.callback,
                asset = new AssetGraph.Html({
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
            expect(text, 'to equal', '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get text of AssetGraph.Html with text property': {
        topic: function () {
            return new AssetGraph.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            }).text;
        },
        'should return the right value': function (text) {
            expect(text, 'to equal', '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get rawSrc of AssetGraph.Html with rawSrc property': {
        topic: function () {
            return new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            }).rawSrc;
        },
        'should return the right value': function (rawSrc) {
            expect(rawSrc.toString('utf-8'), 'to equal', '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get rawSrc of AssetGraph.Html with rawSrcProxy': {
        topic: function () {
            var callback = this.callback,
                asset = new AssetGraph.Html({
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
            expect(rawSrc.toString('utf-8'), 'to equal', '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get rawSrc of AssetGraph.Html with text property': {
        topic: function () {
            return new AssetGraph.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            }).rawSrc;
        },
        'should return the right value': function (rawSrc) {
            expect(rawSrc.toString('utf-8'), 'to equal', '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>');
        }
    },

    'get text of AssetGraph.Html with rawSrc property and modified parse tree': {
        topic: function () {
            var htmlAsset = new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            return htmlAsset.text;
        },
        'should return the right value': function (text) {
            expect(text, 'to equal', '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get text of AssetGraph.Html with rawSrcProxy and modified parse tree': {
        topic: function () {
            var htmlAsset = new AssetGraph.Html({
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
            expect(text, 'to equal', '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get text of AssetGraph.Html with text property and modified parse tree': {
        topic: function () {
            var htmlAsset = new AssetGraph.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            return htmlAsset.text;
        },
        'should return the right value': function (text) {
            expect(text, 'to equal', '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get rawSrc of AssetGraph.Html with rawSrc property and modified parse tree': {
        topic: function () {
            var htmlAsset = new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>')
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            return htmlAsset.rawSrc;
        },
        'should return the right value': function (rawSrc) {
            expect(rawSrc.toString('utf-8'), 'to equal', '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get rawSrc of AssetGraph.Html with rawSrcProxy and modified parse tree': {
        topic: function () {
            var htmlAsset = new AssetGraph.Html({
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
            expect(rawSrc.toString('utf-8'), 'to equal', '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    },

    'get rawSrc of AssetGraph.Html with text property and modified parse tree': {
        topic: function () {
            var htmlAsset = new AssetGraph.Html({
                text: '<!DOCTYPE html>\n<html><body>Hello, world!\u263a</body></html>'
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            return htmlAsset.rawSrc;
        },
        'should return the right value': function (rawSrc) {
            expect(rawSrc.toString('utf-8'), 'to equal', '<!DOCTYPE html>\n<html><body>Not so much!</body></html>');
        }
    }
})['export'](module);
