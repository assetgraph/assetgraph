var util = require('util'),
    errors = require('../errors'),
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

        if ('related_applications' in manifest) {
            var relatedApps = manifest.related_applications;

            if (!Array.isArray(relatedApps)) {
                self.assetGraph.emit('warn', new errors.SyntaxError({
                    message: 'mainfest.related_applications must be an array',
                    asset: self
                }));
            } else {
                relatedApps.forEach(function (relatedApp) {
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
        }

        return outgoingRelations;
    }
});

module.exports = ApplicationManifest;
