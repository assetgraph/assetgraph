const JavaScriptRelation = require('./JavaScriptRelation');

class JavaScriptWebWorker extends JavaScriptRelation {
  get href() {
    return this.node.value;
  }

  set href(href) {
    this.node.value = this._fixupSetHref(href);
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
