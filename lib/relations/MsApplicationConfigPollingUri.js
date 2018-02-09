const Relation = require('./Relation');

class MsApplicationConfigPollingUri extends Relation {
  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  inline() {
    throw new Error('MsApplicationConfigPollingUri.inline: Not supported');
  }

  attach() {
    throw new Error('MsApplicationConfigPollingUri.attach: Not supported');
  }

  detach() {
    this.node.parentNode.removeChild(this.node);
    this.node = undefined;
    return super.detach();
  }
}

module.exports = MsApplicationConfigPollingUri;
