var unquote = require('./unquote');
var cssPseudoElementRegExp = require('../cssPseudoElementRegExp');

function getPseudoElements(htmlAsset) {
    var document = htmlAsset.parseTree;
    var cssAssets = htmlAsset.assetGraph.collectAssetsPreOrder(htmlAsset)
        .filter(function (asset) { return asset.isLoaded; })
        .filter(function (asset) {
            return asset.type === 'Css'
                && asset.isExternalizable === true; // exclude inline style attributes
        });

    var propsBySelector = {};

    cssAssets.forEach(function (cssAsset) {
        cssAsset.eachRuleInParseTree(function (node, rule) {
            var selector = node.selector;

            if (node.type === 'rule' && selector && selector.match(cssPseudoElementRegExp)) {
                if (!propsBySelector[selector]) {
                    propsBySelector[selector] = {};
                }

                node.nodes.forEach(function (declaration) {
                    var value = declaration.value;
                    var previousValue = propsBySelector[selector][declaration.prop] || '';

                    if (declaration.important) {
                        value += ' !important';
                    }

                    if (!declaration.important && previousValue.endsWith('!important')) {
                        return;
                    }

                    propsBySelector[selector][declaration.prop] = value;
                });
            }
        });
    });

    var nodes = [];

    Object.keys(propsBySelector)
        .forEach(function (selector) {
            var node = document.createElement('span');
            var inlineStyle = Object.keys(propsBySelector[selector])
                .map(function (prop) {
                    return prop + ': ' + propsBySelector[selector][prop];
                })
                .join('; ');

            node.setAttribute('style', inlineStyle);
            var content = propsBySelector[selector].content;
            var matchAttr = content && content.match(/^attr\(([\w-]+)\)$/);
            var parentSelector = selector.replace(cssPseudoElementRegExp, '');
            var parentNodes = document.querySelectorAll(parentSelector) || [];

            Array.prototype.forEach.call(parentNodes, function (parentNode) {
                var clonedPseudoNode = node.cloneNode(true);
                var text;
                if (matchAttr) {
                    var attributeValue = parentNode.getAttribute(matchAttr[1]);
                    if (attributeValue) {
                        text = attributeValue;
                    }
                } else if (content) {
                    text = unquote(content);
                }
                if (text) {
                    clonedPseudoNode.appendChild(document.createTextNode(text));

                    // Fake the parent node
                    Object.defineProperty(clonedPseudoNode, 'parentNode', {
                        get: function () { return parentNode; }
                    });

                    nodes.push(clonedPseudoNode);
                }
            });
        });

    return nodes;
};

module.exports = getPseudoElements;
