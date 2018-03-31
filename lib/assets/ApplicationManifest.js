const Json = require('./Json');

class ApplicationManifest extends Json {
  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }

    const manifest = this.parseTree;

    if (!manifest) {
      return outgoingRelations;
    }

    if (typeof manifest.start_url === 'string') {
      outgoingRelations.push({
        type: 'JsonUrl',
        href: manifest.start_url,
        hrefScope: manifest,
        hrefProperty: 'start_url'
      });
    }

    if (Array.isArray(manifest.related_applications)) {
      for (const relatedApp of manifest.related_applications) {
        if (typeof relatedApp.url === 'string') {
          outgoingRelations.push({
            type: 'JsonUrl',
            href: relatedApp.url,
            hrefScope: relatedApp,
            hrefProperty: 'url'
          });
        }
      }
    }

    if (Array.isArray(manifest.splash_screens)) {
      for (const splashScreen of manifest.splash_screens) {
        if (typeof splashScreen.src === 'string') {
          outgoingRelations.push({
            type: 'JsonUrl',
            href: splashScreen.src,
            hrefScope: splashScreen,
            hrefProperty: 'src'
          });
        }
      }
    }

    if (Array.isArray(manifest.icons)) {
      for (const icon of manifest.icons) {
        if (typeof icon.src === 'string') {
          outgoingRelations.push({
            type: 'JsonUrl',
            href: icon.src,
            hrefScope: icon,
            hrefProperty: 'src'
          });
        }
      }
    }

    return outgoingRelations;
  }
}

Object.assign(ApplicationManifest.prototype, {
  contentType: 'application/manifest+json',

  supportedExtensions: ['.webmanifest']
});

module.exports = ApplicationManifest;
