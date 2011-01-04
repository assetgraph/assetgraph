#!/usr/bin/env node

var error = require('./error'),
    HttpLoader = require('./loaders/Http'),
    SiteGraph = require('./SiteGraph');

var siteGraph = new SiteGraph(),
    loader = new HttpLoader({
        siteGraph: siteGraph,
        root: 'http://localhost:3000/'
    });

var asset = loader.loadAsset({
    type: 'HTML',
    url: 'index.html'
});

loader.populate(asset, ['htmlScript', 'htmlStyle', 'htmlImage', 'htmlIframe', 'cssBackgroundImage'], error.throwException());
