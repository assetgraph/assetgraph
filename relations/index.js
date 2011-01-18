/*global exports*/
['HTMLStyle', 'HTMLScript', 'HTMLShortcutIcon', 'HTMLImage', 'HTMLIFrame', 'HTMLCacheManifest',
 'JavaScriptStaticInclude', 'JavaScriptLazyInclude', 'JavaScriptStaticUrl',
 'CSSBackgroundImage', 'CSSSpritePlaceholder', 'CSSAlphaImageLoader', 'CSSSpritePlaceholder'].forEach(function (relationType) {
    exports[relationType] = require('./' + relationType)[relationType];
    exports[relationType].prototype.type = relationType;
});
