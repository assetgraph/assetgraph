var vows = require('vows'),
    assert = require('assert'),
    fsTools = require('../lib/util/fsTools');

vows.describe('Utility functions in fsTools').addBatch({
    'dirExistsCached(non-existent dir)': {
        topic: function () {
            fsTools.dirExistsCached(__dirname + "/i/do/not/exist", this.callback);
        },
        'should return false': function (err, dirExists) {
            assert.isNull(err);
            assert.isFalse(dirExists);
        }
    },
    'dirExists(existing dir)': {
        topic: function () {
            fsTools.dirExistsCached(__dirname + "/CacheManifest", this.callback);
        },
        'should return true': function (err, dirExists) {
            assert.isNull(err);
            assert.isTrue(dirExists);
        }
    },
    'findParentDirCached(__dirname + "/CacheManifest", "CacheManifest")': {
        topic: function () {
            fsTools.findParentDirCached(__dirname + "/CacheManifest", "CacheManifest", this.callback);
        },
        'should find the cacheManifest dir': function (err, result) {
            assert.isNull(err);
            assert.equal(result, __dirname + '/CacheManifest');
        }
    },
    'findParentDirCached(__dirname + "/CacheManifest", "bogus")': {
        topic: function () {
            fsTools.findParentDirCached(__dirname + "/CacheManifest", "bogus", this.callback);
        },
        'should give an error': function (err, result) {
            assert.instanceOf(err, Error);
        }
    },
    'findParentDirCached(__dirname, "htmlObject")': {
        topic: function () {
            fsTools.findParentDirCached(__dirname, "htmlObject", this.callback);
        },
        'should find the htmlObject dir': function (err, result) {
            assert.equal(result, __dirname + '/htmlObject');
        }
    }
})['export'](module);
