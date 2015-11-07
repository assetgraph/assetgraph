var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Json = require('./Json'),
    AssetGraph = require('../');

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
        var outgoingRelations = [];

        if (!manifest) {
            return outgoingRelations;
        }

        if (typeof manifest.start_url === 'string') {
            outgoingRelations.push(new AssetGraph.Relation({
                from: self,
                to: {
                    url: manifest.start_url
                }
            }));
        }

        if (Array.isArray(manifest.related_applications)) {
            manifest.related_applications.forEach(function (relatedApp) {
                if (typeof relatedApp.url === 'string') {
                    outgoingRelations.push(new AssetGraph.Relation({
                        from: self,
                        to: {
                            url: relatedApp.url
                        }
                    }));
                }
            });
        }

        return outgoingRelations;
    }
});

module.exports = ApplicationManifest;
