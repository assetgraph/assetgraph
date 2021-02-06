const JavaScriptRelation = require('./JavaScriptRelation');

class JavaScriptServiceWorkerRegistration extends JavaScriptRelation {
  get href() {
    return this.node.arguments[0].value;
  }

  set href(href) {
    this.node.arguments[0].value = this._fixupSetHref(href);
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
