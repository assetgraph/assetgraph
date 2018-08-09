const _ = require('lodash');
const url = require('url');
const Promise = require('bluebird');
const memoizeSync = require('memoizesync');
const urltools = require('urltools');
const compileQuery = require('../compileQuery');

const AssetGraph = require('../../');

const getTextByFontProperties = require('../util/fonts/getTextByFontProperties');
const getGoogleIdForFontProps = require('../util/fonts/getGoogleIdForFontProps');
const snapToAvailableFontProperties = require('../util/fonts/snapToAvailableFontProperties');
const findCustomPropertyDefinitions = require('../util/fonts/findCustomPropertyDefinitions');
const extractReferencedCustomPropertyNames = require('../util/fonts/extractReferencedCustomPropertyNames');
const stripLocalTokens = require('../util/fonts/stripLocalTokens');
const injectSubsetDefinitions = require('../util/fonts/injectSubsetDefinitions');
const cssFontParser = require('css-font-parser');
const cssListHelpers = require('css-list-helpers');
const LinesAndColumns = require('lines-and-columns').default;
const fontkit = require('fontkit');

const unquote = require('../util/fonts/unquote');
const normalizeFontPropertyValue = require('../util/fonts/normalizeFontPropertyValue');
const getCssRulesByProperty = require('../util/fonts/getCssRulesByProperty');
const unicodeRange = require('../util/fonts/unicode-range');

const googleFontsCssUrlRegex = /^(?:https?:)?\/\/fonts\.googleapis\.com\/css/;

const initialValueByProp = _.pick(require('../util/fonts/initialValueByProp'), [
  'font-style',
  'font-weight',
  'font-stretch'
]);

function cssQuoteIfNecessary(value) {
  if (/^\w+$/.test(value)) {
    return value;
  } else {
    return `'${value.replace(/'/g, "\\'")}'`;
  }
}

function getGoogleFontSubsetCssUrl(fontProps, text) {
  const googleFontId = getGoogleIdForFontProps(fontProps);

  return `https://fonts.googleapis.com/css?family=${googleFontId}&text=${encodeURIComponent(
    text
  )}`;
}

function getPreferredFontUrl(cssFontFaceSrcRelations = []) {
  const formatOrder = ['woff2', 'woff', 'truetype', 'opentype'];

  const typeOrder = ['Woff2', 'Woff', 'Ttf', 'Otf'];

  for (const format of formatOrder) {
    const relation = cssFontFaceSrcRelations.find(
      r => r.format && r.format.toLowerCase() === format
    );

    if (relation) {
      return relation.to.url;
    }
  }

  for (const assetType of typeOrder) {
    const relation = cssFontFaceSrcRelations.find(r => r.to.type === assetType);

    if (relation) {
      return relation.to.url;
    }
  }
}

// Takes the output of util/fonts/getTextByFontProperties
function groupTextsByFontFamilyProps(
  textByPropsArray,
  availableFontFaceDeclarations
) {
  const snappedTexts = textByPropsArray
    .map(textAndProps => {
      const activeFontFaceDeclaration = snapToAvailableFontProperties(
        availableFontFaceDeclarations,
        textAndProps.props
      );

      if (!activeFontFaceDeclaration) {
        return null;
      }

      const { relations, ...props } = activeFontFaceDeclaration;
      const fontUrl = getPreferredFontUrl(relations);

      return {
        text: textAndProps.text,
        props,
        fontRelations: relations,
        fontUrl
      };
    })
    .filter(textByProps => textByProps && textByProps.fontUrl);

  const textsByFontUrl = _.groupBy(snappedTexts, 'fontUrl');

  return _.map(textsByFontUrl, (textsPropsArray, fontUrl) => {
    const texts = textsPropsArray.map(obj => obj.text);
    const fontFamilies = new Set(
      textsPropsArray.map(obj => obj.props['font-family'])
    );
    const pageText = _.uniq(texts.join(''))
      .sort()
      .join('');

    let smallestOriginalSize;
    let smallestOriginalFormat;
    for (const relation of textsPropsArray[0].fontRelations) {
      if (relation.to.isLoaded) {
        const size = relation.to.rawSrc.length;
        if (smallestOriginalSize === undefined || size < smallestOriginalSize) {
          smallestOriginalSize = size;
          smallestOriginalFormat = relation.to.type.toLowerCase();
        }
      }
    }

    return {
      smallestOriginalSize,
      smallestOriginalFormat,
      texts,
      pageText,
      text: pageText,
      props: { ...textsPropsArray[0].props },
      fontUrl,
      fontFamilies
    };
  });
}

function getParents(assetGraph, asset, assetQuery) {
  const assetMatcher = compileQuery(assetQuery);
  const seenAssets = new Set();
  const parents = [];
  (function visit(asset) {
    if (seenAssets.has(asset)) {
      return;
    }
    seenAssets.add(asset);

    for (const incomingRelation of asset.incomingRelations) {
      if (assetMatcher(incomingRelation.from)) {
        parents.push(incomingRelation.from);
      } else {
        visit(incomingRelation.from);
      }
    }
  })(asset);

  return parents;
}

function asyncLoadStyleRelationWithFallback(
  htmlAsset,
  originalRelation,
  insertPoint
) {
  const injectionPointRelation = insertPoint || htmlAsset.outgoingRelations[0];
  // Resource hint: prefetch google font stylesheet
  const fontDomainPreconnect = htmlAsset.addRelation(
    {
      type: 'HtmlPreconnectLink',
      hrefType: 'absolute',
      to: { url: 'https://fonts.gstatic.com' }
    },
    'after',
    injectionPointRelation
  );

  // Resource hint: prefetch google font stylesheet
  const parsedOriginalUrl = url.parse(originalRelation.to.url);
  htmlAsset.addRelation(
    {
      type: 'HtmlPreconnectLink',
      hrefType: 'absolute',
      to: { url: `https://${parsedOriginalUrl.host}` }
    },
    'before',
    fontDomainPreconnect
  );

  // Async load google font stylesheet
  // Insert async CSS loading <script>
  const asyncCssLoadingRelation = htmlAsset.addRelation(
    {
      type: 'HtmlScript',
      hrefType: 'inline',
      to: {
        type: 'JavaScript',
        text: `
          (function () {
            var el = document.createElement('link');
            el.href = '${originalRelation.to.url}'.toString('url');
            el.rel = 'stylesheet';
            ${
              originalRelation.media
                ? `el.media = '${originalRelation.media}';`
                : ''
            }
            document.body.appendChild(el);
          }())
        `
      }
    },
    'lastInBody'
  );

  // Insert <noscript> fallback sync CSS loading
  const noScriptFallbackRelation = htmlAsset.addRelation(
    {
      type: 'HtmlNoscript',
      to: {
        type: 'Html',
        text: ''
      }
    },
    'lastInBody'
  );

  noScriptFallbackRelation.to.addRelation(
    {
      type: 'HtmlStyle',
      media: originalRelation.media,
      to: originalRelation.to
    },
    'last'
  );

  noScriptFallbackRelation.inline();

  // Clean up
  originalRelation.detach();

  asyncCssLoadingRelation.to.minify();
  htmlAsset.markDirty();
}

function getSubsetPromiseId(fontUsage, format) {
  return [fontUsage.text, fontUsage.fontUrl, format].join('\x1d');
}

async function getSubsetsForFontUsage(
  assetGraph,
  htmlAssetTextsWithProps,
  formats
) {
  let subsetLocalFont;

  try {
    subsetLocalFont = require('../util/fonts/subsetLocalFont');
  } catch (err) {
    assetGraph.info(
      new Error(
        'Local subsetting is not possible because fonttools are not installed. Falling back to only subsetting Google Fonts. Run `pip install fonttools brotli zopfli` to enable local font subsetting'
      )
    );
  }

  const allFonts = [];

  for (const item of htmlAssetTextsWithProps) {
    for (const fontUsage of item.fontUsages) {
      if (!fontUsage.fontUrl) {
        continue;
      }

      if (!allFonts.includes(fontUsage.fontUrl)) {
        allFonts.push(fontUsage.fontUrl);
      }
    }
  }

  if (subsetLocalFont) {
    await assetGraph.populate({
      followRelations: {
        to: { url: { $or: allFonts } }
      }
    });

    const originalFontBuffers = allFonts.reduce((result, fontUrl) => {
      const fontAsset = assetGraph.findAssets({
        url: fontUrl,
        isLoaded: true
      })[0];

      if (fontAsset) {
        result[fontUrl] = fontAsset.rawSrc;
      }

      return result;
    }, {});

    const subsetPromiseMap = {};

    for (const item of htmlAssetTextsWithProps) {
      for (const fontUsage of item.fontUsages) {
        const fontBuffer = originalFontBuffers[fontUsage.fontUrl];
        const text = fontUsage.text;
        for (const format of formats) {
          const promiseId = getSubsetPromiseId(fontUsage, format);

          if (!subsetPromiseMap[promiseId]) {
            subsetPromiseMap[promiseId] = subsetLocalFont(
              fontBuffer,
              format,
              text
            ).catch(err => {
              const error = new Error(err.message);
              error.asset = assetGraph.findAssets({
                url: fontUsage.fontUrl
              })[0];

              assetGraph.warn(error);
            });
          }

          subsetPromiseMap[promiseId].then(fontBuffer => {
            if (fontBuffer) {
              if (!fontUsage.subsets) {
                fontUsage.subsets = {};
              }
              fontUsage.subsets[format] = fontBuffer;
              const size = fontBuffer.length;
              if (
                !fontUsage.smallestSubsetSize ||
                size < fontUsage.smallestSubsetSize
              ) {
                fontUsage.smallestSubsetSize = size;
                fontUsage.smallestSubsetFormat = format;
              }
            }
          });
        }
      }
    }

    await Promise.all(Object.values(subsetPromiseMap));
  } else {
    const fontCssUrlMap = {};

    for (const item of htmlAssetTextsWithProps) {
      for (const fontUsage of item.fontUsages) {
        if (!fontUsage.fontUrl) {
          continue;
        }

        const fontAsset = assetGraph.findAssets({ url: fontUsage.fontUrl })[0];

        if (fontAsset.hostname !== 'fonts.gstatic.com') {
          continue;
        }

        for (const format of formats) {
          const mapId = getSubsetPromiseId(fontUsage, format);

          if (!fontCssUrlMap[mapId]) {
            fontCssUrlMap[mapId] = `${getGoogleFontSubsetCssUrl(
              fontUsage.props,
              fontUsage.text
            )}&format=${format}`;
          }
        }
      }
    }

    const assetGraphForLoadingFonts = new AssetGraph();

    for (const format of formats) {
      assetGraphForLoadingFonts.teepee.headers['User-Agent'] =
        fontFormatUA[format];
      const formatUrls = _.uniq(
        Object.values(fontCssUrlMap).filter(url =>
          url.endsWith(`format=${format}`)
        )
      );
      await assetGraphForLoadingFonts.loadAssets(Object.values(formatUrls));
    }

    await assetGraphForLoadingFonts.populate({
      followRelations: {
        type: 'CssFontFaceSrc'
      }
    });

    for (const item of htmlAssetTextsWithProps) {
      for (const fontUsage of item.fontUsages) {
        for (const format of formats) {
          const cssUrl = fontCssUrlMap[getSubsetPromiseId(fontUsage, format)];
          const cssAsset = assetGraphForLoadingFonts.findAssets({
            url: cssUrl,
            isLoaded: true
          })[0];
          if (cssAsset) {
            const fontRelation = cssAsset.outgoingRelations[0];
            const fontAsset = fontRelation.to;

            if (fontAsset.isLoaded) {
              if (!fontUsage.subsets) {
                fontUsage.subsets = {};
              }

              fontUsage.subsets[format] = fontAsset.rawSrc;
            }
          }
        }
      }
    }
  }
}

const fontContentTypeMap = {
  woff: 'font/woff', // https://tools.ietf.org/html/rfc8081#section-4.4.5
  woff2: 'font/woff2'
};

const fontOrder = ['woff2', 'woff'];

const getFontFaceForFontUsage = memoizeSync(
  fontUsage => {
    const subsets = fontOrder
      .filter(format => fontUsage.subsets[format])
      .map(format => ({
        format,
        url: `data:${fontContentTypeMap[format]};base64,${fontUsage.subsets[
          format
        ].toString('base64')}`
      }));

    const resultString = ['@font-face {'];

    resultString.push(
      ...Object.keys(fontUsage.props)
        .sort()
        .map(prop => {
          let value = fontUsage.props[prop];

          if (prop === 'font-family') {
            value = cssQuoteIfNecessary(`${value}__subset`);
          }

          if (prop === 'src') {
            value = subsets
              .map(subset => `url(${subset.url}) format('${subset.format}')`)
              .join(', ');
          }

          return `${prop}: ${value};`;
        })
        .map(str => `  ${str}`)
    );

    resultString.push(
      `  unicode-range: ${unicodeRange(fontUsage.codepoints.used)};`
    );

    resultString.push('}');

    return resultString.join('\n');
  },
  {
    argumentsStringifier: args => {
      return [args[0].text, args[0].props, args[1]]
        .map(arg => JSON.stringify(arg))
        .join('\x1d');
    }
  }
);

function getFontUsageStylesheet(fontUsages, accumulatedFontFaceDeclarations) {
  // Find the available @font-face declarations where the font-family is used
  // (so there will be subsets created), but the specific variant isn't used.
  const unusedFontFaceDeclarations = accumulatedFontFaceDeclarations.filter(
    decl =>
      fontUsages.some(fontUsage =>
        fontUsage.fontFamilies.has(decl['font-family'])
      ) &&
      !fontUsages.some(
        ({ props }) =>
          props['font-style'] === decl['font-style'] &&
          props['font-weight'] === decl['font-weight'] &&
          props['font-stretch'] === decl['font-stretch'] &&
          props['font-family'].toLowerCase() ===
            decl['font-family'].toLowerCase()
      )
  );
  return fontUsages
    .filter(fontUsage => fontUsage.subsets)
    .map(fontUsage => getFontFaceForFontUsage(fontUsage))
    .concat(
      unusedFontFaceDeclarations.map(props => {
        let src = stripLocalTokens(props.src);
        if (props.relations.length > 0) {
          const targets = props.relations.map(relation => relation.to.url);
          src = src.replace(
            props.relations[0].tokenRegExp,
            () => `url('${targets.shift().replace(/'/g, "\\'")}')`
          );
        }
        return `@font-face{font-family:${
          props['font-family']
        }__subset;font-stretch:${props['font-stretch']};font-style:${
          props['font-style']
        };font-weight:${props['font-weight']};src:${src}}`;
      })
    )
    .join('\n\n');
}

const fontFormatUA = {
  woff:
    'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0',
  woff2:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36'
};

const validFontDisplayValues = [
  'auto',
  'block',
  'swap',
  'fallback',
  'optional'
];

module.exports = ({
  formats = ['woff2', 'woff'],
  subsetPath = 'subfont/',
  subsetPerPage,
  inlineSubsets,
  inlineCss,
  fontDisplay
} = {}) => {
  if (!validFontDisplayValues.includes(fontDisplay)) {
    fontDisplay = undefined;
  }

  return async function subsetFonts(assetGraph) {
    const htmlAssetTextsWithProps = [];
    const subsetUrl = urltools.ensureTrailingSlash(
      assetGraph.root + subsetPath
    );

    await assetGraph.populate({
      followRelations: {
        $or: [
          {
            to: {
              url: googleFontsCssUrlRegex
            }
          },
          {
            type: 'CssFontFaceSrc',
            from: {
              url: googleFontsCssUrlRegex
            }
          }
        ]
      }
    });

    // Collect texts by page

    const memoizedGetCssRulesByProperty = memoizeSync(getCssRulesByProperty);
    const htmlAssets = assetGraph.findAssets({ type: 'Html', isInline: false });
    const traversalRelationQuery = {
      $or: [
        {
          type: { $in: ['HtmlStyle', 'CssImport'] }
        },
        {
          to: {
            type: 'Html',
            isInline: true
          }
        }
      ]
    };

    // Keep track of the injected CSS assets that should eventually be minified
    // Minifying them along the way currently doesn't work because some of the
    // manipulation is sensitive to the exact text contents. We should fix that.
    const subsetFontsToBeMinified = new Set();

    for (const htmlAsset of htmlAssets) {
      const accumulatedFontFaceDeclarations = [];

      assetGraph.eachAssetPreOrder(htmlAsset, traversalRelationQuery, asset => {
        if (asset.type === 'Css' && asset.isLoaded) {
          const seenNodes = new Set();

          const fontRelations = asset.outgoingRelations.filter(
            relation => relation.type === 'CssFontFaceSrc'
          );

          for (const fontRelation of fontRelations) {
            const node = fontRelation.node;

            if (!seenNodes.has(node)) {
              seenNodes.add(node);

              const fontFaceDeclaration = {
                relations: fontRelations.filter(r => r.node === node)
              };
              for (const prop of Object.keys(initialValueByProp)) {
                fontFaceDeclaration[prop] = normalizeFontPropertyValue(
                  prop,
                  initialValueByProp[prop]
                );
              }

              node.walkDecls(declaration => {
                const propName = declaration.prop.toLowerCase();
                fontFaceDeclaration[propName] = normalizeFontPropertyValue(
                  propName,
                  declaration.value
                );
              });

              accumulatedFontFaceDeclarations.push(fontFaceDeclaration);
            }
          }
        }
      });

      if (accumulatedFontFaceDeclarations.length > 0) {
        const seenFontFaceCombos = new Set();
        for (const fontFace of accumulatedFontFaceDeclarations) {
          const key = `${fontFace['font-family']}/${fontFace['font-style']}/${
            fontFace['font-weight']
          }`;
          if (seenFontFaceCombos.has(key)) {
            throw new Error(
              `Multiple @font-face with the same font-family/font-style/font-weight (maybe with different unicode-range?) is not supported yet: ${key}`
            );
          }
          seenFontFaceCombos.add(key);
        }

        const textByProps = getTextByFontProperties(
          htmlAsset,
          memoizedGetCssRulesByProperty
        );

        htmlAssetTextsWithProps.push({
          htmlAsset,
          fontUsages: groupTextsByFontFamilyProps(
            textByProps,
            accumulatedFontFaceDeclarations
          ),
          accumulatedFontFaceDeclarations
        });
      }
    }

    if (htmlAssetTextsWithProps.length <= 1) {
      subsetPerPage = false;
    }

    if (!subsetPerPage) {
      const globalFontUsage = {};

      // Gather all texts
      for (const htmlAssetTextWithProps of htmlAssetTextsWithProps) {
        for (const fontUsage of htmlAssetTextWithProps.fontUsages) {
          if (!globalFontUsage[fontUsage.fontUrl]) {
            globalFontUsage[fontUsage.fontUrl] = [];
          }

          globalFontUsage[fontUsage.fontUrl].push(fontUsage.text);
        }
      }

      // Merge subset values, unique glyphs, sort
      for (const htmlAssetTextWithProps of htmlAssetTextsWithProps) {
        for (const fontUsage of htmlAssetTextWithProps.fontUsages) {
          fontUsage.text = _.uniq(globalFontUsage[fontUsage.fontUrl].join(''))
            .sort()
            .join('');
        }
      }
    }

    if (fontDisplay) {
      for (const htmlAssetTextWithProps of htmlAssetTextsWithProps) {
        for (const fontUsage of htmlAssetTextWithProps.fontUsages) {
          fontUsage.props['font-display'] = fontDisplay;
        }
      }
    }

    // Generate codepoint sets for original font, the used subset and the unused subset
    for (const htmlAssetTextWithProps of htmlAssetTextsWithProps) {
      for (const fontUsage of htmlAssetTextWithProps.fontUsages) {
        const originalFont = assetGraph.findAssets({
          url: fontUsage.fontUrl
        })[0];
        if (originalFont.isLoaded) {
          let originalCodepoints;
          try {
            // Guard against 'Unknown font format' errors
            originalCodepoints = fontkit.create(originalFont.rawSrc)
              .characterSet;
          } catch (err) {}
          if (originalCodepoints) {
            const usedCodepoints = fontUsage.text
              .split('')
              .map(c => c.codePointAt(0));
            const unusedCodepoints = originalCodepoints.filter(
              n => !usedCodepoints.includes(n)
            );

            fontUsage.codepoints = {
              original: originalCodepoints,
              used: usedCodepoints,
              unused: unusedCodepoints
            };
          }
        }
      }
    }

    // Generate subsets:
    await getSubsetsForFontUsage(assetGraph, htmlAssetTextsWithProps, formats);

    // Warn about missing glyphs
    const missingGlyphsErrors = [];

    for (const { htmlAsset, fontUsages } of htmlAssetTextsWithProps) {
      for (const fontUsage of fontUsages) {
        if (fontUsage.subsets) {
          const characterSet = fontkit.create(fontUsage.subsets.woff)
            .characterSet;

          for (const char of [...fontUsage.pageText]) {
            // Turns out that browsers don't mind that these are missing:
            if (char === '\t' || char === '\n') {
              continue;
            }

            const codePoint = char.codePointAt(0);

            const isMissing = !characterSet.includes(codePoint);

            if (isMissing) {
              let location;
              const charIdx = htmlAsset.text.indexOf(char);

              if (charIdx === -1) {
                location = `${htmlAsset.urlOrDescription} (generated content)`;
              } else {
                const position = new LinesAndColumns(
                  htmlAsset.text
                ).locationForIndex(charIdx);
                location = `${htmlAsset.urlOrDescription}:${position.line +
                  1}:${position.column + 1}`;
              }

              missingGlyphsErrors.push({
                codePoint,
                char,
                htmlAsset,
                fontUsage,
                location
              });
            }
          }
        }
      }
    }

    if (missingGlyphsErrors.length) {
      const errorLog = missingGlyphsErrors.map(
        ({ char, fontUsage, location }) =>
          `- \\u{${char
            .charCodeAt(0)
            .toString(16)}} (${char}) in font-family '${
            fontUsage.props['font-family']
          }' (${fontUsage.props['font-weight']}/${
            fontUsage.props['font-style']
          }) at ${location}`
      );

      const message = `Missing glyph fallback detected.
When your primary webfont doesn't contain the glyphs you use, your browser will load your fallback fonts, which will be a potential waste of bandwidth.
These glyphs are used on your site, but they don't exist in the font you applied to them:`;

      assetGraph.warn(new Error(`${message}\n${errorLog.join('\n')}`));
    }

    // Insert subsets:

    const cssAssetMap = {};

    for (const {
      htmlAsset,
      fontUsages,
      accumulatedFontFaceDeclarations
    } of htmlAssetTextsWithProps) {
      const insertionPoint = assetGraph.findRelations({
        type: 'HtmlStyle',
        from: htmlAsset
      })[0];
      const subsetFontUsages = fontUsages.filter(
        fontUsage => fontUsage.subsets
      );
      const unsubsettedFontUsages = fontUsages.filter(
        fontUsage => !subsetFontUsages.includes(fontUsage)
      );

      // Remove all existing preload hints to fonts that might have new subsets
      for (const fontUsage of fontUsages) {
        for (const relation of assetGraph.findRelations({
          type: { $or: ['HtmlPrefetchLink', 'HtmlPreloadLink'] },
          from: htmlAsset,
          to: {
            url: fontUsage.fontUrl
          }
        })) {
          if (relation.type === 'HtmlPrefetchLink') {
            const err = new Error(
              `Detached ${
                relation.node.outerHTML
              }. Will be replaced with preload with JS fallback.\nIf you feel this is wrong, open an issue at https://github.com/assetgraph/assetgraph/issues`
            );
            err.asset = relation.from;
            err.relation = relation;

            assetGraph.info(err);
          }

          relation.detach();
        }
      }

      if (unsubsettedFontUsages.length > 0) {
        // Insert <link rel="preload">
        const preloadRelations = unsubsettedFontUsages.map(fontUsage => {
          // Always preload unsubsetted font files, they might be any format, so can't be clever here
          return htmlAsset.addRelation(
            {
              type: 'HtmlPreloadLink',
              hrefType: 'rootRelative',
              to: fontUsage.fontUrl,
              as: 'font'
            },
            'before',
            insertionPoint
          );
        });

        // Generate JS fallback for browser that don't support <link rel="preload">
        const preloadData = unsubsettedFontUsages.map((fontUsage, idx) => {
          const preloadRelation = preloadRelations[idx];

          const formatMap = {
            '.woff': 'woff',
            '.woff2': 'woff2',
            '.ttf': 'truetype',
            '.svg': 'svg',
            '.eot': 'embedded-opentype'
          };
          const name = fontUsage.props['font-family'];
          const props = Object.keys(initialValueByProp).reduce(
            (result, prop) => {
              if (
                fontUsage.props[prop] !==
                normalizeFontPropertyValue(prop, initialValueByProp[prop])
              ) {
                result[prop] = fontUsage.props[prop];
              }
              return result;
            },
            {}
          );

          return `new FontFace(
            "${name}",
            "url('" + "${preloadRelation.href}".toString('url') + "') format('${
            formatMap[preloadRelation.to.extension]
          }')",
            ${JSON.stringify(props)}
          ).load();`;
        });

        const originalFontJsPreloadAsset = htmlAsset.addRelation(
          {
            type: 'HtmlScript',
            hrefType: 'inline',
            to: {
              type: 'JavaScript',
              text: `try{${preloadData.join('')}}catch(e){}`
            }
          },
          'before',
          insertionPoint
        ).to;

        for (const [
          idx,
          relation
        ] of originalFontJsPreloadAsset.outgoingRelations.entries()) {
          relation.hrefType = 'rootRelative';
          relation.to = preloadRelations[idx].to;
          relation.refreshHref();
        }

        originalFontJsPreloadAsset.minify();
      }
      if (subsetFontUsages.length < 1) {
        return { fontInfo: [] };
      }

      const subsetCssText = getFontUsageStylesheet(
        subsetFontUsages,
        accumulatedFontFaceDeclarations
      );
      let cssAsset = cssAssetMap[subsetCssText];
      if (!cssAsset) {
        cssAsset = assetGraph.addAsset({
          type: 'Css',
          url: `${subsetUrl}subfontTemp.css`,
          text: subsetCssText
        });

        subsetFontsToBeMinified.add(cssAsset);
        cssAssetMap[subsetCssText] = cssAsset;

        if (!inlineSubsets) {
          for (const fontRelation of cssAsset.outgoingRelations) {
            const fontAsset = fontRelation.to;
            const extension = fontAsset.contentType.split('/').pop();

            const nameProps = ['font-family', 'font-weight', 'font-style']
              .map(prop =>
                fontRelation.node.nodes.find(decl => decl.prop === prop)
              )
              .map(decl => decl.value);

            const fileNamePreFix = `${unquote(nameProps[0])
              .replace(/__subset$/, '')
              .replace(/ /g, '_')}-${normalizeFontPropertyValue(
              'font-weight',
              nameProps[1]
            )}${nameProps[2] === 'italic' ? 'i' : ''}`;

            const fontFileName = `${fileNamePreFix}-${fontAsset.md5Hex.slice(
              0,
              10
            )}.${extension}`;

            fontAsset.url = subsetUrl + fontFileName;

            if (inlineCss) {
              fontRelation.hrefType = 'rootRelative';
            } else {
              fontRelation.hrefType = 'relative';
            }
          }
        }

        const cssFileName = `fonts-${cssAsset.md5Hex.slice(0, 10)}.css`;
        cssAsset.url = subsetUrl + cssFileName;
      }

      if (!inlineSubsets) {
        for (const fontRelation of cssAsset.outgoingRelations) {
          const fontAsset = fontRelation.to;

          if (fontAsset.contentType === 'font/woff2') {
            // Only <link rel="preload"> for woff2 files
            // Preload support is a subset of woff2 support:
            // - https://caniuse.com/#search=woff2
            // - https://caniuse.com/#search=preload

            htmlAsset.addRelation(
              {
                type: 'HtmlPreloadLink',
                hrefType: 'rootRelative',
                to: fontAsset,
                as: 'font'
              },
              'before',
              insertionPoint
            );
          }
        }
      }
      const cssRelation = htmlAsset.addRelation(
        {
          type: 'HtmlStyle',
          hrefType: inlineCss ? 'inline' : 'rootRelative',
          to: cssAsset
        },
        'before',
        insertionPoint
      );

      // JS-based font preloading for browsers without <link rel="preload"> support
      if (inlineCss) {
        // If the CSS is inlined we can use the font declarations directly to load the fonts
        htmlAsset
          .addRelation(
            {
              type: 'HtmlScript',
              hrefType: 'inline',
              to: {
                type: 'JavaScript',
                text:
                  'try { document.fonts.forEach(function (f) { f.family.indexOf("__subset") !== -1 && f.load(); }); } catch (e) {}'
              }
            },
            'after',
            cssRelation
          )
          .to.minify();
      } else {
        // The CSS is external, can't use the font face declarations without waiting for a blocking load.
        // Go for direct FontFace construction instead
        const fontFaceContructorCalls = [];

        cssAsset.parseTree.walkAtRules('font-face', rule => {
          let name;
          let url;
          const props = {};

          rule.walkDecls(({ prop, value }) => {
            const propName = prop.toLowerCase();
            if (propName === 'font-weight') {
              value = normalizeFontPropertyValue('font-weight', value);
            }

            if (propName in initialValueByProp) {
              if (
                normalizeFontPropertyValue(propName, value) !==
                normalizeFontPropertyValue(
                  propName,
                  initialValueByProp[propName]
                )
              ) {
                props[propName] = value;
              }
            }

            if (propName === 'font-family') {
              name = value;
            } else if (propName === 'src') {
              const fontRelations = cssAsset.outgoingRelations.filter(
                relation => relation.node === rule
              );
              const urlStrings = value
                .split(/,\s*/)
                .filter(entry => entry.startsWith('url('));
              const urlValues = urlStrings.map((urlString, idx) =>
                urlString.replace(
                  fontRelations[idx].href,
                  '\'" + "/__subfont__".toString("url") + "\''
                )
              );
              url = `"${urlValues.join(', ')}"`;
            }
          });

          fontFaceContructorCalls.push(
            `new FontFace("${name}", ${url}, ${JSON.stringify(props)}).load();`
          );
        });

        const jsPreloadAsset = htmlAsset
          .addRelation(
            {
              type: 'HtmlScript',
              hrefType: 'inline',
              to: {
                type: 'JavaScript',
                text: `try {${fontFaceContructorCalls.join('')}} catch (e) {}`
              }
            },
            'before',
            cssRelation
          )
          .to.minify();

        for (const [
          idx,
          relation
        ] of jsPreloadAsset.outgoingRelations.entries()) {
          relation.to = cssAsset.outgoingRelations[idx].to;
          relation.hrefType = 'rootRelative';
          relation.refreshHref();
        }
      }
    }

    // Async load Google Web Fonts CSS

    const googleFontStylesheets = assetGraph.findAssets({
      type: 'Css',
      url: { $regex: googleFontsCssUrlRegex }
    });
    for (const googleFontStylesheet of googleFontStylesheets) {
      const seenPages = new Set(); // Only do the work once for each font on each page
      for (const googleFontStylesheetRelation of googleFontStylesheet.incomingRelations) {
        let htmlParents;

        if (googleFontStylesheetRelation.type === 'CssImport') {
          // Gather Html parents. Relevant if we are dealing with CSS @import relations
          htmlParents = getParents(
            assetGraph,
            googleFontStylesheetRelation.to,
            {
              type: 'Html',
              isInline: false,
              isLoaded: true
            }
          );
        } else if (googleFontStylesheetRelation.from.type === 'Html') {
          htmlParents = [googleFontStylesheetRelation.from];
        } else {
          htmlParents = [];
        }
        for (const htmlParent of htmlParents) {
          if (seenPages.has(htmlParent)) {
            continue;
          }
          seenPages.add(htmlParent);
          asyncLoadStyleRelationWithFallback(
            htmlParent,
            googleFontStylesheetRelation,
            htmlParent.outgoingRelations.find(
              relation => relation.type === 'HtmlStyle'
            )
          );
        }
      }
      googleFontStylesheet.unload();
    }

    // Use subsets in font-family:

    const webfontNameMap = {};

    for (const { fontUsages } of htmlAssetTextsWithProps) {
      for (const { subsets, fontFamilies, props } of fontUsages) {
        if (subsets) {
          for (const fontFamily of fontFamilies) {
            webfontNameMap[fontFamily.toLowerCase()] = `${
              props['font-family']
            }__subset`;
          }
        }
      }
    }

    let customPropertyDefinitions; // Avoid computing this unless necessary
    // Inject subset font name before original webfont
    const cssAssets = assetGraph.findAssets({
      type: 'Css',
      isLoaded: true
    });
    let changesMadeToCustomPropertyDefinitions = false;
    for (const cssAsset of cssAssets) {
      let changesMade = false;
      cssAsset.eachRuleInParseTree(cssRule => {
        if (cssRule.parent.type === 'rule' && cssRule.type === 'decl') {
          const propName = cssRule.prop.toLowerCase();
          if (
            (propName === 'font' || propName === 'font-family') &&
            cssRule.value.includes('var(')
          ) {
            if (!customPropertyDefinitions) {
              customPropertyDefinitions = findCustomPropertyDefinitions(
                cssAssets
              );
            }
            for (const customPropertyName of extractReferencedCustomPropertyNames(
              cssRule.value
            )) {
              for (const relatedCssRule of [
                cssRule,
                ...(customPropertyDefinitions[customPropertyName] || [])
              ]) {
                const modifiedValue = injectSubsetDefinitions(
                  relatedCssRule.value,
                  webfontNameMap
                );
                if (modifiedValue !== relatedCssRule.value) {
                  relatedCssRule.value = modifiedValue;
                  changesMadeToCustomPropertyDefinitions = true;
                }
              }
            }
          } else if (propName === 'font-family') {
            const fontFamilies = cssListHelpers
              .splitByCommas(cssRule.value)
              .map(unquote);
            const subsetFontFamily =
              webfontNameMap[fontFamilies[0].toLowerCase()];
            if (subsetFontFamily && !fontFamilies.includes(subsetFontFamily)) {
              cssRule.value = `${cssQuoteIfNecessary(subsetFontFamily)}, ${
                cssRule.value
              }`;
              changesMade = true;
            }
          } else if (propName === 'font') {
            const fontProperties = cssFontParser(cssRule.value);
            const fontFamilies =
              fontProperties && fontProperties['font-family'].map(unquote);
            if (fontFamilies) {
              const subsetFontFamily =
                webfontNameMap[fontFamilies[0].toLowerCase()];
              if (
                subsetFontFamily &&
                !fontFamilies.includes(subsetFontFamily)
              ) {
                // FIXME: Clean up and move elsewhere
                fontFamilies.unshift(subsetFontFamily);
                const stylePrefix = fontProperties['font-style']
                  ? `${fontProperties['font-style']} `
                  : '';
                const weightPrefix = fontProperties['font-weight']
                  ? `${fontProperties['font-weight']} `
                  : '';
                const lineHeightSuffix = fontProperties['line-height']
                  ? `/${fontProperties['line-height']}`
                  : '';
                cssRule.value = `${stylePrefix}${weightPrefix}${
                  fontProperties['font-size']
                }${lineHeightSuffix} ${fontFamilies
                  .map(cssQuoteIfNecessary)
                  .join(', ')}`;
                changesMade = true;
              }
            }
          }
        }
      });
      if (changesMade) {
        cssAsset.markDirty();
      }
    }

    // This is a bit crude, could be more efficient if we tracked the containing asset in findCustomPropertyDefinitions
    if (changesMadeToCustomPropertyDefinitions) {
      for (const cssAsset of cssAssets) {
        cssAsset.markDirty();
      }
    }

    // This is a bit awkward now, but if it's done sooner, it breaks the CSS source regexping:
    for (const cssAsset of subsetFontsToBeMinified) {
      await cssAsset.minify();
    }

    // Hand out some useful info about the detected subsets:
    return {
      fontInfo: htmlAssetTextsWithProps.map(({ fontUsages, htmlAsset }) => ({
        htmlAsset: htmlAsset.urlOrDescription,
        fontUsages: fontUsages.map(fontUsage => _.omit(fontUsage, 'subsets'))
      }))
    };
  };
};
