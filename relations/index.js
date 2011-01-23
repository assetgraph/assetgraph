/*global exports*/
['HTMLStyle', 'HTMLScript', 'HTMLShortcutIcon', 'HTMLImage', 'HTMLIFrame', 'HTMLCacheManifest',
 'JavaScriptStaticInclude', 'JavaScriptLazyInclude', 'JavaScriptStaticUrl', 'JavaScriptIfEnvironment',
 'CSSBackgroundImage', 'CSSSpritePlaceholder', 'CSSAlphaImageLoader', 'CSSSpritePlaceholder',
 'CacheManifestEntry'].forEach(function (relationType) {
    exports[relationType] = require('./' + relationType)[relationType];
    exports[relationType].prototype.type = relationType;
});
