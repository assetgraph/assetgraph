var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
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
            expect(asset.internalText, 'to equal', asset.text);
        }
    },
    'In an underscore template HTML asset': {
        topic: function () {
            return asset('<div><% foo %></div>');
        },
        'The internal representation should not be the same as the external': function (asset) {
            expect(asset.internalText, 'not to equal', asset.text);
        },
        'The internal representation should be correct': function (asset) {
            expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
        },
        'The template replacement should contain the correct value': function (asset) {
            expect(asset._templateReplacements['⋖5⋗'], 'to equal', '<% foo %>');
        },
        'The text getter should return the same as the text input': function (asset) {
            expect(asset.text, 'to equal', '<div><% foo %></div>');
        },
        'after using the text setter': {
            topic: function (asset) {
                asset.text = '<div><% bar %></div>';
                return asset;
            },
            'The internal representation should be correct': function (asset) {
                expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
            },
            'The text getter should return the same as the setter input': function (asset) {
                expect(asset.text, 'to equal', '<div><% bar %></div>');
            }
        }
    },
    'In a php template HTML asset': {
        topic: function () {
            return asset('<div><? foo ?></div>');
        },
        'The internal representation should not be the same as the external': function (asset) {
            expect(asset.internalText, 'not to equal', asset.text);
        },
        'The internal representation should be correct': function (asset) {
            expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
        },
        'The template replacement should contain the correct value': function (asset) {
            expect(asset._templateReplacements['⋖5⋗'], 'to equal', '<? foo ?>');
        },
        'The text getter should return the same as the text input': function (asset) {
            expect(asset.text, 'to equal', '<div><? foo ?></div>');
        },
        'after using the text setter': {
            topic: function (asset) {
                asset.text = '<div><? bar ?></div>';
                return asset;
            },
            'The internal representation should be correct': function (asset) {
                expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
            },
            'The text getter should return the same as the setter input': function (asset) {
                expect(asset.text, 'to equal', '<div><? bar ?></div>');
            }
        }
    },
    'In an underscore template HTML asset with a PHP close tag inside the dynamic part': {
        topic: function () {
            return asset('<div><% foo ?> %></div>');
        },
        'The internal representation should be correct': function (asset) {
            expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
        },
        'The text getter should return the same as the text input': function (asset) {
            expect(asset.text, 'to equal', '<div><% foo ?> %></div>');
        },
    },
    'With a HTML asset with an underscore template': {
        topic: function () {
            return asset('<div><% foo %></div>');
        },
        'the text getter should return the same as the text input': function (asset) {
            expect(asset.text, 'to equal', '<div><% foo %></div>');
        },
        'then removing the divs childNode using DOM': {
            topic: function (asset) {
                asset.parseTree.firstChild.removeChild(asset.parseTree.firstChild.firstChild);
                asset.markDirty();
                return asset;
            },
            'the text getter should return the correct output': function (asset) {
                expect(asset.text, 'to equal', '<div></div>');
            }
        }
    }
})['export'](module);
