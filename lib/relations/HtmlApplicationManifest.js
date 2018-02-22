const HtmlRelation = require('./HtmlRelation');

/* Models application manifests.
 *
 * See following resources for further details
 *
 * - https://developers.google.com/web/updates/2014/11/Support-for-installable-web-apps-with-webapp-manifest-in-chrome-38-for-Android
 * - https://developer.chrome.com/multidevice/android/installtohomescreen
 */

class HtmlApplicationManifest extends HtmlRelation {
  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'manifest');
    return super.attach(position, adjacentRelation);
  }
}

HtmlApplicationManifest.prototype.targetType = 'ApplicationManifest';

module.exports = HtmlApplicationManifest;
