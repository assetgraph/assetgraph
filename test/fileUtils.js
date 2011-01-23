var vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    fileUtils = require('../fileUtils');

vows.describe('Utility functions in fileUtils').addBatch({
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
