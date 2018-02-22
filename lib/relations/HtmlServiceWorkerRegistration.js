// https://w3c.github.io/ServiceWorker/#link-type-serviceworker

const HtmlRelation = require('./HtmlRelation');

class HtmlServiceWorkerRegistration extends HtmlRelation {
  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'serviceworker');

    if (this.scope) {
      this.node.setAttribute('scope', this.scope);
    }

    super.attach(position, adjacentRelation);
  }

  inline() {
    throw new Error(
      'HtmlServiceWorkerRegistration: Inlining of service worker relations is not allowed'
    );
  }
}

HtmlServiceWorkerRegistration.prototype.targetType = 'JavaScript';

module.exports = HtmlServiceWorkerRegistration;
