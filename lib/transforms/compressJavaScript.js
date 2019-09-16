const os = require('os');
const { promisify } = require('util');
const pMap = require('p-map');
const errors = require('../errors');
const compressorByName = {};

for (const compressorName of ['uglifyJs', 'terser']) {
  const compressorModule = require(compressorName.replace(
    'uglifyJs',
    'uglify-js'
  ));

  compressorByName[compressorName] = async (
    assetGraph,
    javaScript,
    compressorOptions = {}
  ) => {
    const {
      sourceMaps,
      mangleOptions,
      ...remainingOptions
    } = compressorOptions;

    const sideEffects = {
      ...(javaScript.serializationOptions &&
        javaScript.serializationOptions.side_effects),
      ...(assetGraph.javaScriptSerializationOptions &&
        assetGraph.javaScriptSerializationOptions.side_effects)
    };

    let ie8;
    if (
      javaScript.serializationOptions &&
      typeof javaScript.serializationOptions.ie8 !== 'undefined'
    ) {
      ie8 = !!javaScript.serializationOptions.ie8;
    } else if (
      javaScript.serializationOptions &&
      typeof javaScript.serializationOptions.screw_ie8 !== 'undefined'
    ) {
      ie8 = !javaScript.serializationOptions.screw_ie8;
    } else if (
      assetGraph.javaScriptSerializationOptions &&
      typeof assetGraph.javaScriptSerializationOptions.ie8 !== 'undefined'
    ) {
      ie8 = !!assetGraph.javaScriptSerializationOptions.ie8;
    } else if (
      assetGraph.javaScriptSerializationOptions &&
      typeof assetGraph.javaScriptSerializationOptions.screw_ie8 !== 'undefined'
    ) {
      ie8 = !assetGraph.javaScriptSerializationOptions.screw_ie8;
    }

    let text;
    let sourceMap;
    if (sourceMaps) {
      ({ text, sourceMap } = javaScript.textAndSourceMap);
    } else {
      text = javaScript.text;
    }

    const { error, code, map } = compressorModule.minify(text, {
      sourceMap: { content: sourceMap },
      compress: {
        ...sideEffects,
        ...remainingOptions
      },
      mangle: mangleOptions,
      output: { comments: true, source_map: true, ast: true },
      ie8
    });
    if (error) {
      throw new errors.ParseError({
        message: `Parse error in ${javaScript.urlOrDescription}\n${
          error.message
        } (line ${error.line}, column ${error.col + 1})`,
        line: error.line,
        column: error.col + 1,
        pos: error.pos,
        asset: javaScript
      });
    }
    return {
      type: 'JavaScript',
      lastKnownByteLength: javaScript.lastKnownByteLength, // I know, I know
      copyrightNoticeComments: javaScript.copyrightNoticeComments,
      text: code,
      isDirty: true,
      _toBeMinified: javaScript._toBeMinified,
      isPretty: javaScript.isPretty,
      sourceMap: map
    };
  };
}

compressorByName.yuicompressor = async (
  assetGraph,
  javaScript,
  compressorOptions = {}
) => {
  let yuicompressor;
  try {
    yuicompressor = require('yui-compressor');
  } catch (e) {
    throw new Error(
      "transforms.compressJavaScript: node-yui-compressor not found. Please run 'npm install yui-compressor' and try again (tested with version 0.1.3)."
    );
  }

  return {
    type: 'JavaScript',
    copyrightNoticeComments: javaScript.copyrightNoticeComments,
    text: await promisify(yuicompressor.compile)(
      javaScript.text,
      compressorOptions
    )
  };
};

compressorByName.closurecompiler = async (
  assetGraph,
  javaScript,
  compressorOptions
) => {
  let closurecompiler;
  try {
    closurecompiler = require('closure-compiler');
  } catch (e) {
    throw new Error(
      "transforms.compressJavaScript: node-closure-compiler not found. Please run 'npm install closure-compiler' and try again (tested with version 0.1.1)."
    );
  }
  compressorOptions = compressorOptions || {};
  return {
    type: 'JavaScript',
    copyrightNoticeComments: javaScript.copyrightNoticeComments,
    text: await promisify(closurecompiler.compile)(
      javaScript.text,
      compressorOptions
    )
  };
};

module.exports = (queryObj, compressorName = 'terser', compressorOptions) => {
  if (!compressorByName[compressorName]) {
    throw new Error(
      `transforms.compressJavaScript: Unknown compressor: ${compressorName}`
    );
  }
  return async function compressJavaScript(assetGraph) {
    await pMap(
      assetGraph.findAssets({ type: 'JavaScript', ...queryObj }),
      async javaScript => {
        try {
          const compressedJavaScript = await compressorByName[compressorName](
            assetGraph,
            javaScript,
            compressorOptions
          );
          javaScript.replaceWith(compressedJavaScript);
          compressedJavaScript.serializationOptions = {
            ...javaScript.serializationOptions
          };
          compressedJavaScript.initialComments = javaScript.initialComments;
          javaScript.unload();
        } catch (err) {
          assetGraph.warn(err);
        }
      },
      { concurrency: os.cpus().length + 1 }
    );
  };
};
