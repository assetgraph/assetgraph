const Relation = require('../Relation');

class ApplicationManifestUrl extends Relation {
  static getRelationsFromNode(manifest) {
    const outgoingRelations = [];
    if (typeof manifest.start_url === 'string') {
      outgoingRelations.push({
        type: 'ApplicationManifestUrl',
        href: manifest.start_url,
        hrefScope: manifest,
        hrefProperty: 'start_url',
      });
    }

    if (Array.isArray(manifest.related_applications)) {
      for (const relatedApp of manifest.related_applications) {
        if (typeof relatedApp.url === 'string') {
          outgoingRelations.push({
            type: 'ApplicationManifestUrl',
            href: relatedApp.url,
            hrefScope: relatedApp,
            hrefProperty: 'url',
          });
        }
      }
    }

    if (Array.isArray(manifest.splash_screens)) {
      for (const splashScreen of manifest.splash_screens) {
        if (typeof splashScreen.src === 'string') {
          outgoingRelations.push({
            type: 'ApplicationManifestUrl',
            href: splashScreen.src,
            hrefScope: splashScreen,
            hrefProperty: 'src',
          });
        }
      }
    }

    if (Array.isArray(manifest.icons)) {
      for (const icon of manifest.icons) {
        if (typeof icon.src === 'string') {
          outgoingRelations.push({
            type: 'ApplicationManifestUrl',
            href: icon.src,
            hrefScope: icon,
            hrefProperty: 'src',
          });
        }
      }
    }
    return outgoingRelations;
  }

  get href() {
    return this.hrefScope[this.hrefProperty];
  }

  set href(href) {
    this.hrefScope[this.hrefProperty] = href;
  }

  inline() {
    throw new Error('ApplicationManifestUrl.inline(): Not supported.');
  }

  attach() {
    throw new Error('ApplicationManifestUrl.attach(): Not supported.');
  }

  detach() {
    throw new Error('ApplicationManifestUrl.detach(): Not supported.');
  }
}

module.exports = ApplicationManifestUrl;
