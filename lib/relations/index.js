/*global exports*/
['HTMLStyle', 'HTMLScript', 'HTMLShortcutIcon', 'HTMLImage', 'HTMLAnchor', 'HTMLIFrame', 'HTMLCacheManifest', 'HTMLConditionalComment',
 'HTMLAlternateLink',
 'JavaScriptStaticInclude', 'JavaScriptLazyInclude', 'JavaScriptStaticUrl',
 'CSSImage', 'CSSImport', 'CSSAlphaImageLoader', 'CSSBehavior',
 'CacheManifestEntry'].forEach(function (relationType) {
    exports[relationType] = require('./' + relationType);
    exports[relationType].prototype.type = relationType;
});
