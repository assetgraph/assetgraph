/*global exports*/
['HTMLStyle', 'HTMLScript', 'HTMLShortcutIcon', 'HTMLImage', 'HTMLAnchor', 'HTMLIFrame', 'HTMLCacheManifest',
 'JavaScriptStaticInclude', 'JavaScriptLazyInclude', 'JavaScriptStaticUrl', 'JavaScriptIfEnvironment',
 'CSSBackgroundImage', 'CSSImport', 'CSSSpritePlaceholder', 'CSSAlphaImageLoader', 'CSSSpritePlaceholder',
 'CacheManifestEntry'].forEach(function (relationType) {
    exports[relationType] = require('./' + relationType)[relationType];
    exports[relationType].prototype.type = relationType;
});
