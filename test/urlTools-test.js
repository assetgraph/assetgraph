var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools');

vows.describe('Utility functions in urlTools').addBatch({
    'buildRelativeUrl with different protocols': {
        topic: urlTools.buildRelativeUrl('http://example.com/the/thing.html', 'file:///home/thedude/stuff.png'),
        'should give up and return the absolute target url': function (relativeUrl) {
            assert.equal(relativeUrl, 'file:///home/thedude/stuff.png');
        }
    },
    'buildRelativeUrl from and to http, same hostname': {
        topic: urlTools.buildRelativeUrl('http://example.com/the/thing.html', 'http://example.com/the/other/stuff.html'),
        'should build a proper relative url': function (relativeUrl) {
            assert.equal(relativeUrl, 'other/stuff.html');
        }
    },
    'buildRelativeUrl from and to http, different hostname': {
        topic: urlTools.buildRelativeUrl('http://example.com/index.html', 'http://other.com/index.html'),
        'should give up and return the absolute target url': function (relativeUrl) {
            assert.equal(relativeUrl, 'http://other.com/index.html');
        }
    },
    'buildRelativeUrl to file in dir one level up with shared prefix': {
        topic: urlTools.buildRelativeUrl('file:///home/andreas/mystuff.txt', 'file:///home/anders/hisstuff.txt'),
        'should build the proper relative url': function (relativeUrl) {
            assert.equal(relativeUrl, '../anders/hisstuff.txt');
        }
    },
    'buildRelativeUrl to file in dir one level up': {
        topic: urlTools.buildRelativeUrl('file:///home/andreas/mystuff.txt', 'file:///home/otherguy/hisstuff.txt'),
        'should build the proper relative url': function (relativeUrl) {
            assert.equal(relativeUrl, '../otherguy/hisstuff.txt');
        }
    },
    'buildRelativeUrl to file one level down': {
        topic: urlTools.buildRelativeUrl('file:///home/andreas/work/oneweb/http-pub/', 'file:///home/andreas/work/oneweb/http-pub/static/413c60cd8d.css'),
        'should build the proper relative url': function (relativeUrl) {
            assert.equal(relativeUrl, 'static/413c60cd8d.css');
        }
    }
})['export'](module);
