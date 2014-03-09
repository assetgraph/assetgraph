var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

function asset(inputHtml) {
    return new AssetGraph.Html({
        text: inputHtml
    });
}

vows.describe('Html template escaping').addBatch({
    'In a non-templated HTML asset': {
        topic: function () {
            return asset('<div></div>');
        },
        'The internal represenation should be the same as the external': function (asset) {
            assert.equal(asset.internalText, asset.text);
        }
    },
    'In an underscore template HTML asset': {
        topic: function () {
            return asset('<div><% foo %></div>');
        },
        'The internal representation should not be the same as the external': function (asset) {
            assert.notEqual(asset.internalText, asset.text);
        },
        'The internal representation should be correct': function (asset) {
            assert.equal(asset.internalText, '<div>⋖5⋗</div>');
        },
        'The template replacement should contain the correct value': function (asset) {
            assert.equal(asset._templateReplacements['⋖5⋗'], '<% foo %>');
        },
        'The text getter should return the same as the text input': function (asset) {
            assert.equal(asset.text, '<div><% foo %></div>');
        },
        'after using the text setter': {
            topic: function (asset) {
                asset.text = '<div><% bar %></div>';
                return asset;
            },
            'The internal representation should be correct': function (asset) {
                assert.equal(asset.internalText, '<div>⋖5⋗</div>');
            },
            'The text getter should return the same as the setter input': function (asset) {
                assert.equal(asset.text, '<div><% bar %></div>');
            }
        }
    },
    'In a php template HTML asset': {
        topic: function () {
            return asset('<div><? foo ?></div>');
        },
        'The internal representation should not be the same as the external': function (asset) {
            assert.notEqual(asset.internalText, asset.text);
        },
        'The internal representation should be correct': function (asset) {
            assert.equal(asset.internalText, '<div>⋖5⋗</div>');
        },
        'The template replacement should contain the correct value': function (asset) {
            assert.equal(asset._templateReplacements['⋖5⋗'], '<? foo ?>');
        },
        'The text getter should return the same as the text input': function (asset) {
            assert.equal(asset.text, '<div><? foo ?></div>');
        },
        'after using the text setter': {
            topic: function (asset) {
                asset.text = '<div><? bar ?></div>';
                return asset;
            },
            'The internal representation should be correct': function (asset) {
                assert.equal(asset.internalText, '<div>⋖5⋗</div>');
            },
            'The text getter should return the same as the setter input': function (asset) {
                assert.equal(asset.text, '<div><? bar ?></div>');
            }
        }
    },
    'In an underscore template HTML asset with a PHP close tag inside the dynamic part': {
        topic: function () {
            return asset('<div><% foo ?> %></div>');
        },
        'The internal representation should be correct': function (asset) {
            assert.equal(asset.internalText, '<div>⋖5⋗</div>');
        },
        'The text getter should return the same as the text input': function (asset) {
            assert.equal(asset.text, '<div><% foo ?> %></div>');
        },
    },
    'With a HTML asset with an underscore template': {
        topic: function () {
            return asset('<div><% foo %></div>');
        },
        'the text getter should return the same as the text input': function (asset) {
            assert.equal(asset.text, '<div><% foo %></div>');
        },
        'then removing the divs childNode using DOM': {
            topic: function (asset) {
                asset.parseTree.firstChild.removeChild(asset.parseTree.firstChild.firstChild);
                asset.markDirty();
                return asset;
            },
            'the text getter should return the correct output': function (asset) {
                assert.equal(asset.text, '<div></div>');
            }
        }
    }
})['export'](module);
