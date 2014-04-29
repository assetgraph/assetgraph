var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('I18n').addBatch({
    'After creating and prettyprinting an I18n asset': {
        topic: function () {
            return new AssetGraph.I18n({text: '{"c": {"b": {"e": false, "d": true}, "a": 3}, "b": 2}'});
        },
        'the parse tree of the object should have the keys in the original order': function (i18n) {
            expect(Object.keys(i18n.parseTree), 'to equal', ['c', 'b']);
        },
        'then pretty-print the asset': {
            topic: function (i18n) {
                i18n.prettyPrint();
                return i18n;
            },
            'the parse tree of the object should have the keys in alphabetically sorted order': function (i18n) {
                expect(Object.keys(i18n.parseTree), 'to equal', ['b', 'c']);
            },
            'the second level keys should also be in alphabetically sorted order': function (i18n) {
                expect(Object.keys(i18n.parseTree.c), 'to equal', ['a', 'b']);
            },
            'the third level keys should not be sorted': function (i18n) {
                expect(Object.keys(i18n.parseTree.c.b), 'to equal', ['e', 'd']);
            },
            'then add a new key and pretty print the asset again': {
                topic: function (i18n) {
                    i18n.parseTree.a = {foo: 'bar'};
                    i18n.prettyPrint();
                    return i18n;
                },
                'the parse tree of the object should have the keys in alphabetically sorted order': function (i18n) {
                    expect(Object.keys(i18n.parseTree), 'to equal', ['a', 'b', 'c']);
                }
            }
        }
    }
})['export'](module);
