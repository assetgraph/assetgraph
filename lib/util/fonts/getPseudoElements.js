var unquote = require('./unquote');
var cssPseudoElementRegExp = require('../cssPseudoElementRegExp');

var FONT_PROPS = [
    'font-family',
    'font-style',
    'font-weight'
];

function getPseudoElements(htmlAsset, pseudoFontPropRules) {
    var document = htmlAsset.parseTree;
    var nodes = [];

    Object.keys(pseudoFontPropRules).forEach(function (prop) {
        pseudoFontPropRules[prop] = pseudoFontPropRules[prop].map(function (propRule) {
            return Object.assign(
                {},
                propRule,
                { selector: propRule.selector.replace(cssPseudoElementRegExp, '') }
            );
        });
    });

    pseudoFontPropRules.content
        .filter(function removeDuplicates(contentPropRule, idx) {
            var seenRules = pseudoFontPropRules.content.slice(0, idx);

            return seenRules.every(function (rule) {
                return contentPropRule.selector !== rule.selector;
            });
        })
        .forEach(function (contentPropRule, idx) {
            var parentNodes = [];

            try {
                // jsdom might throw on unsupported
                parentNodes = Array.prototype.slice.call(document.querySelectorAll(contentPropRule.selector));
            } catch (err) {}

            parentNodes.forEach(function (parentNode) {
                var value = contentPropRule.value.split('!')[0].trim();
                var matchAttr = value.match(/^attr\(([\w-]+)\)$/);

                var styles = {};

                FONT_PROPS.forEach(function (prop) {
                    var match = pseudoFontPropRules[prop].find(function (propRule) {
                        return parentNode.matches(propRule.selector);
                    });

                    if (match) {
                        styles[prop] = match.value;
                    }
                });

                var text;
                if (matchAttr) {
                    var attributeValue = parentNode.getAttribute(matchAttr[1]);
                    if (attributeValue) {
                        text = attributeValue;
                    }
                } else {
                    text = unquote(value);
                }

                var pseudoNode = document.createElement('span');
                var inlineStyle = Object.keys(styles)
                    .map(function (prop) {
                        return prop + ': ' + styles[prop];
                    })
                    .join('; ');
                pseudoNode.setAttribute('style', inlineStyle);

                if (text) {
                    pseudoNode.appendChild(document.createTextNode(text));

                    // Fake the parent node
                    Object.defineProperty(pseudoNode, 'parentNode', {
                        get: function () { return parentNode; }
                    });

                    nodes.push(pseudoNode);
                }
            });
        });

    return nodes;
};

module.exports = getPseudoElements;
