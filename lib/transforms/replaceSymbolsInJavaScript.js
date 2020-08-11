// Poor man's uglifyjs --define ... intended for use with --nocompress

const _ = require('lodash');
const parseExpression = require('../parseExpression');
const replaceDescendantNode = require('../replaceDescendantNode');
const esanimate = require('esanimate');
const estraverse = require('estraverse-fb');
const escodegen = require('escodegen');

function astNodesAreIdentical(a, b) {
  // The horror!
  return escodegen.generate(a) === escodegen.generate(b);
}

function isLeftHandSideOfAssignment(stack, topNode) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i].type === 'AssignmentExpression') {
      if (stack[i + 1] === stack[i].left) {
        return true;
      } else {
        break;
      }
    } else if (stack[i].type === 'VariableDeclarator') {
      if ((stack[i + 1] || topNode) === stack[i].id) {
        return true;
      } else {
        break;
      }
    }
  }
  return false;
}

function astObjectIndexOfProperty(ast, key) {
  if (ast.properties && ast.properties.length) {
    for (const [i, propertyNode] of ast.properties.entries()) {
      if (
        (propertyNode.key.type === 'Identifier' ||
          propertyNode.key.type === 'Literal') &&
        (propertyNode.key.name || propertyNode.key.value) === key
      ) {
        return i;
      }
    }
  }
  return -1;
}

module.exports = (queryObj, replacementAstBySymbolName) => {
  replacementAstBySymbolName = { ...replacementAstBySymbolName };
  const nonSymbols = [];
  for (const symbolName of Object.keys(replacementAstBySymbolName)) {
    const expression = parseExpression(symbolName);
    let replacementAst = replacementAstBySymbolName[symbolName];
    // FIXME: Figure out how to avoid this polymorphism. Where is it being used?
    if (!(replacementAst && typeof replacementAst.type === 'string')) {
      if (replacementAst && typeof replacementAst === 'object') {
        replacementAst = esanimate.astify(replacementAst);
      } else {
        replacementAst = parseExpression(String(replacementAst));
      }
    }
    if (expression.type === 'Identifier') {
      replacementAstBySymbolName[expression.name] = replacementAst;
    } else {
      nonSymbols.push({ expression, replacementAst });
    }
  }

  return function replaceSymbolsInJavaScript(assetGraph) {
    for (const javaScript of assetGraph.findAssets({
      type: 'JavaScript',
      ...queryObj,
    })) {
      let replacementPerformed = false;
      estraverse.traverse(javaScript.parseTree, {
        enter(node) {
          let replacementAst;
          if (
            (node.type === 'Literal' || node.type === 'Identifier') &&
            Object.prototype.hasOwnProperty.call(
              replacementAstBySymbolName,
              node.name || node.value
            ) &&
            !isLeftHandSideOfAssignment(this.parents(), node)
          ) {
            replacementAst =
              replacementAstBySymbolName[node.name || node.value];
          } else {
            for (const [i, nonSymbol] of nonSymbols.entries()) {
              if (
                node.constructor === nonSymbol.expression.constructor &&
                astNodesAreIdentical(node, nonSymbol.expression)
              ) {
                replacementAst = nonSymbols[i].replacementAst;
                break;
              }
            }
          }
          if (replacementAst) {
            const stack = this.parents().reverse();
            if (
              stack[0].type === 'MemberExpression' &&
              stack[0].property === node
            ) {
              // Don't consider cases where the identifier is the "property" part of
              // a MemberExpression (eg. don't replace FOO when used as: window.FOO)
              return;
            }
            stack.unshift(node);
            let replacement = node;
            const originalNode = node;
            let dontReplace = false;
            let unmatchedPart = '';
            let replacedUntil = -1;

            for (const [stackIndex, node] of stack.entries()) {
              replacedUntil = stackIndex;
              if (originalNode === node) {
                replacement = _.cloneDeep(replacementAst);
                continue;
              } else if (
                node.type === 'MemberExpression' &&
                replacement !== node
              ) {
                if (
                  node.computed &&
                  node.property.type !== 'Literal' &&
                  node.property.type !== 'Identifier'
                ) {
                  break;
                } else {
                  const propVal = node.computed
                    ? String(node.property.value)
                    : node.property.name || node.property.value;
                  const astIndex = astObjectIndexOfProperty(
                    replacement,
                    propVal
                  );
                  if (astIndex !== -1) {
                    replacement = replacement.properties[astIndex].value;
                  } else {
                    dontReplace = true;
                    unmatchedPart = node;
                  }
                  continue;
                }
              }
              break;
            }

            if (dontReplace) {
              assetGraph.warn(
                new Error(
                  `Could not find a value for "${escodegen.generate(
                    unmatchedPart
                  )}". Replacing with undefined.`
                )
              );
              replaceDescendantNode(
                stack[replacedUntil],
                stack[replacedUntil - 1],
                { type: 'Identifier', name: 'undefined' }
              );
              replacementPerformed = true;
            }

            if (!dontReplace && replacement !== node) {
              replaceDescendantNode(
                stack[replacedUntil],
                stack[replacedUntil - 1],
                replacement
              );
              replacementPerformed = true;
            }
          }
        },
      });
      if (replacementPerformed) {
        javaScript.markDirty();
      }
    }
  };
};
