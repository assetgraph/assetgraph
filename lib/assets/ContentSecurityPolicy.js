var util = require('util'),
    _ = require('lodash'),
    matchSourceExpression = require('../matchSourceExpression'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function toCamelCase(str) {
    return str.replace(/-([a-z])/g, function ($0, ch) {
        return ch.toUpperCase();
    });
}

function fromCamelCase(str) {
    return str.replace(/[A-Z]/g, function ($0) {
        return '-' + $0.toLowerCase();
    });
}

function ContentSecurityPolicy(config) {
    Text.call(this, config);
}

util.inherits(ContentSecurityPolicy, Text);

function normalizeFragment(fragment) {
    if (/^'(?:unsafe-inline|unsafe-eval|unsafe-dynamic|unsafe-hash-attributes|self)'$/i.test(fragment)) {
        return fragment.toLowerCase();
    }
    return fragment.replace(/^[a-z0-9.+-]+:/i, function ($0) {
        return $0.toLowerCase();
    }).replace(/^'sha(\d+)-/i, '\'sha$1-').replace(/^'nonce-/i, '\'nonce-');
}

extendWithGettersAndSetters(ContentSecurityPolicy.prototype, {
    contentType: null,

    supportedExtensions: [],

    get parseTree() {
        if (!this._parseTree) {
            var parseTree = {},
                syntaxErrors = [];
            this.text.split(/\s*;\s*/).forEach(function (directiveStr, i, all) {
                if (!/^\s*$/.test(directiveStr)) {
                    var fragments = directiveStr.replace(/^\s+|\s+$/g, '').split(/\s+/);
                    var directiveName = toCamelCase(fragments.shift().toLowerCase());
                    parseTree[directiveName] = fragments.map(normalizeFragment);
                }
            }, this);
            if (syntaxErrors.length > 0) {
                if (this.assetGraph) {
                    syntaxErrors.forEach(function (syntaxError) {
                        this.assetGraph.emit('warn', syntaxError);
                    }, this);
                } else {
                    throw new Error(_.pluck(syntaxErrors, 'message').join('\n'));
                }
            }
            this._parseTree = parseTree;
        }
        return this._parseTree;
    },

    set parseTree(parseTree) {
        this.unload();
        this._parseTree = parseTree;
        this.markDirty();
    },

    get text() {
        if (typeof this._text !== 'string') {
            if (this._parseTree) {
                this._text = '';
                Object.keys(this._parseTree).forEach(function (directiveName) {
                    this._text += (this._text ? '; ' : '') + fromCamelCase(directiveName);
                    if (this._parseTree[directiveName].length > 0) {
                        this._text += ' ' + this._parseTree[directiveName].join(' ');
                    }
                }, this);
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    lookupDirective: function (directive) {
        // Make sure the directive name is in camel case:
        directive = directive.replace(/-([a-z])/g, function ($0, ch) {
            return ch.toUpperCase();
        });
        if (this.parseTree[directive]) {
            return this.parseTree[directive];
        } else if (ContentSecurityPolicy.directiveFallsBackToDefaultSrc(directive) && this.parseTree.defaultSrc) {
            return this.parseTree.defaultSrc;
        } else {
            return [];
        }
    },

    allows: function (directive, urlOrToken, protectedResourceUrl) {
        var sourceExpressions = this.lookupDirective(directive);
        if (sourceExpressions.length === 0) {
            return false;
        } else if (urlOrToken.charAt(0) === '\'') {
            return sourceExpressions.indexOf(urlOrToken) !== -1;
        } else {
            return sourceExpressions.some(function (sourceExpression) {
                return matchSourceExpression(urlOrToken, sourceExpression, protectedResourceUrl || this.nonInlineAncestor.url);
            }, this);
        }
    }
});

// Grrr...
ContentSecurityPolicy.prototype.__defineSetter__('text', Text.prototype.__lookupSetter__('text'));

var fallsBackToDefaultSrcByDirective = {};

[
    'connect-src',
    'font-src',
    'frame-src',
    'img-src',
    'manifest-src',
    'media-src',
    'object-src',
    'script-src',
    'style-src',
    'worker-src'
].forEach(function (directive) {
    fallsBackToDefaultSrcByDirective[directive] = fallsBackToDefaultSrcByDirective[toCamelCase(directive)] = true;
});

ContentSecurityPolicy.directiveFallsBackToDefaultSrc = function (directive) {
    return !!fallsBackToDefaultSrcByDirective[directive];
};

module.exports = ContentSecurityPolicy;
