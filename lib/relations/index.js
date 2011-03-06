/*global exports*/
['HTMLStyle', 'HTMLScript', 'HTMLShortcutIcon', 'HTMLImage', 'HTMLAnchor', 'HTMLIFrame', 'HTMLCacheManifest', 'HTMLConditionalComment',
 'JavaScriptStaticInclude', 'JavaScriptLazyInclude', 'JavaScriptStaticUrl', 'JavaScriptConditionalBlock',
 'CSSBackgroundImage', 'CSSImport', 'CSSSpritePlaceholder', 'CSSAlphaImageLoader', 'CSSBehavior', 'CSSSpritePlaceholder',
 'CacheManifestEntry'].forEach(function (relationType) {
    exports[relationType] = require('./' + relationType)[relationType];
    exports[relationType].prototype.type = relationType;
});
