const Json = require('./Json');
const AssetGraph = require('../AssetGraph');

class ApplicationManifest extends Json {
    findOutgoingRelationsInParseTree() {
        const manifest = this.parseTree;
        const outgoingRelations = super.findOutgoingRelationsInParseTree();

        if (!manifest) {
            return outgoingRelations;
        }

        if (typeof manifest.start_url === 'string') {
            outgoingRelations.push(new AssetGraph.JsonUrl({
                from: this,
                to: {
                    url: manifest.start_url
                },
                hrefScope: manifest,
                hrefProperty: 'start_url'
            }));
        }

        if (Array.isArray(manifest.related_applications)) {
            for (const relatedApp of manifest.related_applications) {
                if (typeof relatedApp.url === 'string') {
                    outgoingRelations.push(new AssetGraph.JsonUrl({
                        from: this,
                        to: {
                            url: relatedApp.url
                        },
                        hrefScope: relatedApp,
                        hrefProperty: 'url'
                    }));
                }
            }
        }

        if (Array.isArray(manifest.splash_screens)) {
            for (const splashScreen of manifest.splash_screens) {
                if (typeof splashScreen.src === 'string') {
                    outgoingRelations.push(new AssetGraph.JsonUrl({
                        from: this,
                        to: {
                            url: splashScreen.src
                        },
                        hrefScope: splashScreen,
                        hrefProperty: 'src'
                    }));
                }
            }
        }

        if (Array.isArray(manifest.icons)) {
            for (const icon of manifest.icons) {
                if (typeof icon.src === 'string') {
                    outgoingRelations.push(new AssetGraph.JsonUrl({
                        from: this,
                        to: {
                            url: icon.src
                        },
                        hrefScope: icon,
                        hrefProperty: 'src'
                    }));
                }
            }
        }

        return outgoingRelations;
    }
};

Object.assign(ApplicationManifest.prototype, {
    contentType: 'application/manifest+json',

    supportedExtensions: ['.webmanifest']
});

module.exports = ApplicationManifest;
