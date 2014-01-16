#!/usr/bin/env node

var AssetGraph = require('../lib');

AssetGraph({root: __dirname + '/inlineImages'})
    .loadAssets('*.html')
    .populate()
    .inlineRelations({type: ['HtmlImage', 'CssImage']})
    .writeAssetsToStdout({type: 'Html'})
    .run();
