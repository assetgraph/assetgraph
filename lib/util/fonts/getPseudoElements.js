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

                    if (declaration.important) {
                        value += ' !important';
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
            node.appendChild(document.createTextNode(unquote(propsBySelector[selector].content)));

            var parentSelector = selector.replace(cssPseudoElementRegExp, '');

            Array.prototype.forEach.call(document.querySelectorAll(parentSelector) || [], function (parentNode) {
                var clonedPseudoNode = node.cloneNode(true);

                // Fake the parent node
                Object.defineProperty(clonedPseudoNode, 'parentNode', {
                    get: function () { return parentNode; }
                });

                nodes.push(clonedPseudoNode);
            });
        });

    return nodes;
};

module.exports = getPseudoElements;
