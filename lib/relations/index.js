/*global exports*/
['HTMLStyle', 'HTMLScript', 'HTMLShortcutIcon', 'HTMLImage', 'HTMLAnchor', 'HTMLIFrame', 'HTMLCacheManifest', 'HTMLConditionalComment',
 'HTMLAlternateLink',
 'JavaScriptStaticInclude', 'JavaScriptLazyInclude', 'JavaScriptStaticUrl', 'JavaScriptConditionalBlock',
 'CSSImage', 'CSSImport', 'CSSSpritePlaceholder', 'CSSAlphaImageLoader', 'CSSBehavior', 'CSSSpritePlaceholder',
 'CacheManifestEntry'].forEach(function (relationType) {
    exports[relationType] = require('./' + relationType);
    exports[relationType].prototype.type = relationType;
});
