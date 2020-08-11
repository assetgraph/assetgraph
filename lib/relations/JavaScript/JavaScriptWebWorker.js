const Relation = require('../Relation');

class JavaScriptWebWorker extends Relation {
  static get selector() {
    return '!NewExpression[arguments.length=1][arguments.0.value=type(string)] > Identifier.callee[name=Worker]';
  }

  static handler(node) {
    return {
      type: 'JavaScriptWebWorker',
      node,
      href: node.arguments[0].value,
    };
  }

  get href() {
    return this.node.value;
  }

  set href(href) {
    this.node.value = href;
  }

  inline() {
    throw new Error('JavaScriptWebWorker.inline(): Not supported');
  }

  attach() {
    throw new Error('JavaScriptWebWorker.attach(): Not supported');
  }

  detach() {
    throw new Error('JavaScriptWebWorker.detach(): Not supported');
  }
}

JavaScriptWebWorker.prototype.targetType = 'JavaScript';

module.exports = JavaScriptWebWorker;
