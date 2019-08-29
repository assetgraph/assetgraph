const replaceDescendantNode = require('../replaceDescendantNode');
const Relation = require('./Relation');

class JavaScriptWorklet extends Relation {
  static get selectors() {
    return {
      'CallExpression[arguments.length=1][arguments.0.type=Literal][callee=(MemberExpression[property=(Identifier[name=addModule])][object=(MemberExpression[property=(Identifier)][object=(Identifier)])])]'(
        node
      ) {
        // JavaScript paint worklet: https://developer.mozilla.org/en-US/docs/Web/API/PaintWorklet#Load_a_PaintWorklet
        // CSS.paintWorklet.addModule('/rootRelativeHref');
        // CSS.layoutWorklet.addModule('masonry.js');
        // CSS.animationWorklet.addModule('spring-sticky-animator.js')
        // let context = new AudioContext(); context.audioWorklet.addModule('processors.js')
        if (
          [
            'paintWorklet',
            'layoutWorklet',
            'animationWorklet',
            'audioWorklet'
          ].includes(node.callee.object.property.name)
        ) {
          if (
            node.callee.object.object.name === 'CSS' ||
            node.callee.object.property.name === 'audioWorklet'
          ) {
            const hrefNode = node.arguments[0];
            const href = hrefNode.value;

            return {
              type: 'JavaScriptWorklet',
              node: hrefNode,
              parentNode: node,
              href: href
            };

            if (getHrefType(href) === hrefTypes.RELATIVE) {
              const err = new Error(
                `Using a relative URL when adding a worklet can cause problems. The href is resolved relative to the page's url, not the javascript module that include it`
              );
              err.assset = this;
              err.line = hrefNode.loc.start.line;
              err.column = hrefNode.loc.start.column;

              warnings.push(err);
            }
          }
        }
      }
    };
  }

  get href() {
    return this.node.value;
  }

  set href(href) {
    this.node.value = href;
  }

  inline() {
    super.inline();
    const newNode = { type: 'Literal', value: this.to.dataUrl };
    replaceDescendantNode(this.parentNode, this.node, newNode);
    this.node = newNode;
    this.from.markDirty();
    return this;
  }

  attach() {
    throw new Error('JavaScriptWorklet.attach(): Not implemented');
  }

  detach() {
    throw new Error('JavaScriptWorklet.detach(): Not implemented');
  }
}

JavaScriptWorklet.prototype.targetType = 'JavaScript';

module.exports = JavaScriptWorklet;
