var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Json = require('./Json'),
    Text = require('./Text'),
    AssetGraph = require('../AssetGraph');

function ApplicationManifest(config) {
    Json.call(this, config);
}

util.inherits(ApplicationManifest, Json);

extendWithGettersAndSetters(ApplicationManifest.prototype, {
    contentType: 'application/manifest+json',

    supportedExtensions: ['.webmanifest'],

    findOutgoingRelationsInParseTree: function () {
        var self = this;
        var manifest = self.parseTree;
        var outgoingRelations = Text.prototype.findOutgoingRelationsInParseTree.call(this);

        if (!manifest) {
            return outgoingRelations;
        }

        if (typeof manifest.start_url === 'string') {
            outgoingRelations.push(new AssetGraph.JsonUrl({
                from: self,
                to: {
                    url: manifest.start_url
                },
                hrefScope: manifest,
                hrefProperty: 'start_url'
            }));
        }

        if (Array.isArray(manifest.related_applications)) {
            manifest.related_applications.forEach(function (relatedApp) {
                if (typeof relatedApp.url === 'string') {
                    outgoingRelations.push(new AssetGraph.JsonUrl({
                        from: self,
                        to: {
                            url: relatedApp.url
                        },
                        hrefScope: relatedApp,
                        hrefProperty: 'url'
                    }));
                }
            });
        }

        if (Array.isArray(manifest.splash_screens)) {
            manifest.splash_screens.forEach(function (splashScreen) {
                if (typeof splashScreen.src === 'string') {
                    outgoingRelations.push(new AssetGraph.JsonUrl({
                        from: self,
                        to: {
                            url: splashScreen.src
                        },
                        hrefScope: splashScreen,
                        hrefProperty: 'src'
                    }));
                }
            });
        }

        if (Array.isArray(manifest.icons)) {
            manifest.icons.forEach(function (icon) {
                if (typeof icon.src === 'string') {
                    outgoingRelations.push(new AssetGraph.JsonUrl({
                        from: self,
                        to: {
                            url: icon.src
                        },
                        hrefScope: icon,
                        hrefProperty: 'src'
                    }));
                }
            });
        }

        return outgoingRelations;
    }
});

module.exports = ApplicationManifest;
