const Relation = require('../Relation');

class JavaScriptServiceWorkerRegistration extends Relation {
  static get selector() {
    return '!CallExpression > MemberExpression.callee[property.name=register] > MemberExpression.object[object.name=navigator][property.name=serviceWorker]';
  }

  static handler(node) {
    // Service worker registration
    // navigator.serviceWorker.register('sw.js')

    // Scope detection
    // if (node.arguments[1] &&
    //     node.arguments[1].type === 'ObjectExpression'
    //     ) {
    //     const scope = that.assetGraph.root;

    //     node.arguments[1].properties.some(function (property) {
    //         if (property.key.name === 'scope') {
    //             scope = property.value.value;
    //             return true;
    //         }
    //     });
    // }

    return {
      type: 'JavaScriptServiceWorkerRegistration',
      href: node.arguments[0].value,
      node,
    };
  }

  get href() {
    return this.node.arguments[0].value;
  }

  set href(href) {
    this.node.arguments[0].value = href;
  }

  inline() {
    throw new Error(
      'JavaScriptServiceWorkerRegistration.inline(): Not allowed'
    );
  }

  attach() {
    throw new Error(
      'JavaScriptServiceWorkerRegistration.attach(): Not implemented'
    );
  }

  detach() {
    throw new Error(
      'JavaScriptServiceWorkerRegistration.detach(): Not implemented'
    );
  }
}

JavaScriptServiceWorkerRegistration.prototype.targetType = 'JavaScript';

module.exports = JavaScriptServiceWorkerRegistration;
