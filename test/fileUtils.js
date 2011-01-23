var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    fileUtils = require('../fileUtils');

vows.describe('Utility functions in fileUtils').addBatch({
    'buildRelativeUrl with different protocols': {
        topic: fileUtils.buildRelativeUrl(URL.parse('http://example.com/the/thing.html'), URL.parse('file:///home/thedude/stuff.png')),
        'should give up and return the absolute target url': function (relativeUrl) {
            assert.equal(relativeUrl, 'file:///home/thedude/stuff.png');
        }
    },
    'buildRelativeUrl from and to http, same hostname': {
        topic: fileUtils.buildRelativeUrl(URL.parse('http://example.com/the/thing.html'), URL.parse('http://example.com/the/other/stuff.html')),
        'should build a proper relative url': function (relativeUrl) {
            assert.equal(relativeUrl, 'other/stuff.html');
        }
    },
    'buildRelativeUrl from and to http, different hostname': {
        topic: fileUtils.buildRelativeUrl(URL.parse('http://example.com/index.html'), URL.parse('http://other.com/index.html')),
        'should give up and return the absolute target url': function (relativeUrl) {
            assert.equal(relativeUrl, 'http://other.com/index.html');
        }
    },
    'buildRelativeUrl from and to file': {
        topic: fileUtils.buildRelativeUrl(URL.parse('file:///home/andreas/mystuff.txt'), URL.parse('file:///home/otherguy/hisstuff.txt')),
        'should build a proper relative url': function (relativeUrl) {
console.log(relativeUrl);
            assert.equal(relativeUrl, '../otherguy/hisstuff.txt');
        }
    },
    'dirExistsCached(non-existent dir)': {
        topic: function () {
            fileUtils.dirExistsCached(__dirname + "/i/do/not/exist", this.callback);
        },
        'should return false': function (err, dirExists) {
            assert.isNull(err);
            assert.isFalse(dirExists);
        }
    },
    'dirExists(existing dir)': {
        topic: function () {
            fileUtils.dirExistsCached(__dirname + "/cacheManifest", this.callback);
        },
        'should return true': function (err, dirExists) {
            assert.isNull(err);
            assert.isTrue(dirExists);
        }
    },
    'findParentDirCached(__dirname + "/cacheManifest", "cacheManifest")': {
        topic: function () {
            fileUtils.findParentDirCached(__dirname + "/cacheManifest", "cacheManifest", this.callback);
        },
        'should find the cacheManifest dir': function (err, result) {
            assert.isNull(err);
            assert.equal(result, __dirname + '/cacheManifest');
        }
    },
    'findParentDirCached(__dirname + "/cacheManifest", "bogus")': {
        topic: function () {
            fileUtils.findParentDirCached(__dirname + "/cacheManifest", "bogus", this.callback);
        },
        'should give an error': function (err, result) {
            assert.instanceOf(err, Error);
        }
    },
    'findParentDirCached(__dirname, "spriteBackgroundImages")': {
        topic: function () {
            fileUtils.findParentDirCached(__dirname, "spriteBackgroundImages", this.callback);
        },
        'should find the spriteBackgroundImages dir': function (err, result) {
            assert.equal(result, __dirname + '/spriteBackgroundImages');
        }
    }
})['export'](module);
