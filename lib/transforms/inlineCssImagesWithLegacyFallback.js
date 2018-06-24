// Inlines images in Css as data: urls
//
//   If the url of the image has an 'inline' GET parameter, it is inlined if the parameter has a true (or no) value, eg.: foo.png?inline or foo.png?inline=true
//   Otherwise the image will be inlined if the size of the image is less than or equal to 'sizeThreshold' AND the Css asset only has that one relation to the image
//
// Note: If provided, the queryObj argument must specify the set of Html assets to start from so that a fallback IE stylesheet can be created.

function cssRuleIsInsideMediaRule(cssRule) {
  while (cssRule) {
    if (cssRule.type === 'atrule' && cssRule.name === 'media') {
      // MEDIA_RULE
      return true;
    } else {
      cssRule = cssRule.parent;
    }
  }
  return false;
}

module.exports = (queryObj, { sizeThreshold, minimumIeVersion = 1 }) => {
  if (minimumIeVersion === null) {
    minimumIeVersion = Infinity;
  }
  return function inlineCssImagesWithLegacyFallback(assetGraph) {
    const allCssImages = []; // Might contain duplicates
    for (const htmlAsset of assetGraph.findAssets(
      Object.assign({ type: 'Html', isInline: false }, queryObj)
    )) {
      for (const htmlStyle of assetGraph.findRelations({
        type: 'HtmlStyle',
        from: htmlAsset
      })) {
        let cssAsset = htmlStyle.to;
        const cssImages = assetGraph.findRelations({
          type: 'CssImage',
          from: cssAsset,
          to: { isImage: true, isInline: false, isLoaded: true }
        });
        let ieVersion = 1;
        let hasCssImagesToInline = false;

        allCssImages.push(...cssImages);

        /* eslint-disable no-inner-declarations */
        function cssImageShouldBeInlined(cssImage) {
          const inlineParamValue = cssImage.to.query.inline;
          if (inlineParamValue !== undefined) {
            return (
              !inlineParamValue || /^(?:true|on|yes|1)$/i.test(inlineParamValue)
            );
          } else {
            return (
              !/^_/.test(cssImage.propertyName) && // Underscore hack (IE6), don't inline
              sizeThreshold >= 0 &&
              cssImage.to.rawSrc.length <= sizeThreshold &&
              !cssRuleIsInsideMediaRule(cssImage.node) &&
              assetGraph.findRelations({ from: cssAsset, to: cssImage.to })
                .length === 1
            );
          }
        }

        for (const cssImage of cssImages) {
          if (cssImageShouldBeInlined(cssImage)) {
            hasCssImagesToInline = true;
            if (cssImage.to.rawSrc.length > 32 * 1024) {
              ieVersion = 9; // IE 8 doesn't support data URLs > 32 KB
            } else if (ieVersion < 8) {
              ieVersion = 8;
            }
          }
        }
        if (hasCssImagesToInline) {
          if (minimumIeVersion && ieVersion > minimumIeVersion) {
            const document = htmlAsset.parseTree;
            const htmlConditionalComment = htmlAsset.addRelation(
              {
                type: 'HtmlConditionalComment',
                condition: `lt IE ${ieVersion}`,
                to: {
                  type: 'Html',
                  text: ''
                }
              },
              'before',
              htmlStyle
            );
            const internetExplorerConditionalCommentBody =
              htmlConditionalComment.to;
            internetExplorerConditionalCommentBody.addRelation(
              {
                type: 'HtmlStyle',
                hrefType: htmlStyle.hrefType,
                media: htmlStyle.node.getAttribute('media'),
                to: cssAsset
              },
              'first'
            );

            const parentNode = htmlStyle.node.parentNode;
            parentNode.insertBefore(
              document.createComment(`[if gte IE ${ieVersion}]><!`),
              htmlStyle.node
            );
            const endMarker = document.createComment('<![endif]');
            if (htmlStyle.node.nextSibling) {
              parentNode.insertBefore(endMarker, htmlStyle.node.nextSibling);
            } else {
              parentNode.appendChild(endMarker);
            }
            cssAsset = cssAsset.clone(htmlStyle); // Reassign so the inlining itself will happen on the clone
          }

          for (const cssImage of assetGraph
            .findRelations({
              from: cssAsset,
              type: 'CssImage',
              to: { isImage: true, isInline: false, isLoaded: true }
            })
            .filter(cssImageShouldBeInlined)) {
            cssImage.inline();
          }
          if (ieVersion > minimumIeVersion) {
            htmlAsset.markDirty();
          }
        }
      }
    }

    const potentiallyOrphanedAssets = new Set();

    // Remove the inline parameter from the urls of all the seen CssImages (even then ones with ?inline=false)
    for (const cssImage of allCssImages) {
      const url = cssImage.to.url;
      if (url) {
        const strippedUrl = url.replace(
          /\?(|[^#]*&)inline(?:=[^#&]*)?([#&]|$)/,
          ($0, before, after) => {
            if (before || after) {
              return `?${before}${after}`;
            } else {
              return '';
            }
          }
        );
        const existingAsset = assetGraph.findAssets({ url: strippedUrl })[0];
        if (existingAsset && existingAsset !== cssImage.to) {
          potentiallyOrphanedAssets.add(cssImage.to);
          cssImage.to = existingAsset;
        } else {
          cssImage.to.url = strippedUrl;
        }
      }
    }

    for (const asset of potentiallyOrphanedAssets) {
      if (asset.incomingRelations.length === 0) {
        assetGraph.removeAsset(asset);
      }
    }
  };
};
