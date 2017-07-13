/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('transforms/addPrecacheServiceWorker', function () {
    it('should add a precache service worker to a single HTML page', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPrecacheServiceWorker/singlePage/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: /^file:/}}})
            .queue(assetGraph => {
                expect(assetGraph, 'to contain assets', 7);
                expect(assetGraph, 'to contain relations', 9);
                expect(assetGraph, 'to contain asset', 'Png');
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true});
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain asset', {type: 'JavaScript', isLoaded: false});
            })
            .addPrecacheServiceWorker({isInitial: true})
            .queue(assetGraph => {
                expect(assetGraph, 'to contain relations', 'HtmlScript', 4);
                expect(assetGraph, 'to contain relations', 'JavaScriptStaticUrl', 3);
                expect(assetGraph, 'to contain relation', 'JavaScriptServiceWorkerRegistration', 1);
                expect(assetGraph, 'to contain asset', { url: assetGraph.root + 'index-precache-service-worker.js' });
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain', '<script>if (\'serviceWorker\' in navigator)');
                const serviceWorker = assetGraph.findAssets({fileName: 'index-precache-service-worker.js'})[0];
                expect(serviceWorker.text, 'to contain', 'foo.png')
                    .and('to contain', '"/modernBrowsers.js".toString(\'url\')')
                    .and('to contain', 'style.css')
                    .and('not to contain', 'fixIE6.js');
            });
    });

    it('should relay informational messages from sw-precache', function () {
        const infoSpy = sinon.spy();
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPrecacheServiceWorker/singlePage/'})
            .on('info', infoSpy)
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: /^file:/}}})
            .addPrecacheServiceWorker({isInitial: true})
            .then(() => expect(infoSpy, 'to have calls satisfying', () =>
                infoSpy(expect.it('to begin with', 'index-precache-service-worker.js: Total precache size is about'))
            ));
    });

    it('should add precache service workers to multiple pages', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPrecacheServiceWorker/multiPage/'})
            .loadAssets('*.html')
            .populate()
            .queue(assetGraph => {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain relations', 4);
                expect(assetGraph, 'to contain asset', 'Png');
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relations', 'HtmlIFrame');
                expect(assetGraph, 'to contain relations', 'HtmlImage', 2);
            })
            .addPrecacheServiceWorker({isInitial: true})
            .queue(assetGraph => {
                expect(assetGraph, 'to contain relation', 'JavaScriptServiceWorkerRegistration', 2);
                expect(assetGraph, 'to contain relations', 'JavaScriptStaticUrl', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
                expect(assetGraph, 'to contain asset', { url: assetGraph.root + 'index-precache-service-worker.js' })
                    .and('to contain asset', { url: assetGraph.root + 'otherpage-precache-service-worker.js' });
            });
    });

    it('should give up when the target location of the service worker is clobbered', function () {
        const errorSpy = sinon.spy();
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPrecacheServiceWorker/singlePage/'})
            .on('error', errorSpy)
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: /^file:/}}})
            .queue(assetGraph => {
                assetGraph.addAsset(new AssetGraph.JavaScript({
                    url: assetGraph.root + 'index-precache-service-worker.js',
                    text: 'alert("hello");'
                }));
            })
            .addPrecacheServiceWorker({isInitial: true})
            .then(assetGraph => expect(errorSpy, 'to have calls satisfying', () =>
                errorSpy(new Error(`There is already a service worker at ${assetGraph.root}index-precache-service-worker.js -- giving up`))
            ));
    });

    describe('in single:true mode', function () {
        it('should add the same shared precache service worker to multiple pages', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPrecacheServiceWorker/multiPage/'})
                .loadAssets('*.html')
                .populate()
                .queue(assetGraph => {
                    expect(assetGraph, 'to contain assets', 3);
                    expect(assetGraph, 'to contain relations', 4);
                    expect(assetGraph, 'to contain asset', 'Png');
                    expect(assetGraph, 'to contain assets', 'Html', 2);
                    expect(assetGraph, 'to contain relations', 'HtmlIFrame');
                    expect(assetGraph, 'to contain relations', 'HtmlImage', 2);
                })
                .addPrecacheServiceWorker({isInitial: true}, {single: true})
                .queue(assetGraph => {
                    expect(assetGraph, 'to contain relation', 'JavaScriptServiceWorkerRegistration', 2);
                    expect(assetGraph, 'to contain relations', 'JavaScriptStaticUrl', 2);
                    expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
                    expect(assetGraph, 'to contain asset', { url: assetGraph.root + 'index-otherpage-precache-service-worker.js' });
                    expect(assetGraph, 'to contain relations', {
                        to: { fileName: 'index-otherpage-precache-service-worker.js' }
                    }, 2);
                });
        });

        it('should only add one fragment to the service worker file name per unique basename', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPrecacheServiceWorker/multiPage/'})
                .loadAssets('*.html')
                .populate()
                .queue(assetGraph => {
                    assetGraph.findAssets({fileName: 'otherpage.html'})[0].url = assetGraph.root + 'somewhereelse/index.html';
                })
                .addPrecacheServiceWorker({isInitial: true}, {single: true})
                .queue(assetGraph => {
                    expect(assetGraph, 'to contain asset', { url: assetGraph.root + 'index-precache-service-worker.js' });
                });
        });

        it('should put the service worker at a common path prefix', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPrecacheServiceWorker/multiPageInDifferentDirectories/'})
                .loadAssets('**/*.html')
                .populate()
                .queue(assetGraph => {
                    expect(assetGraph, 'to contain assets', 3);
                    expect(assetGraph, 'to contain relations', 2);
                    expect(assetGraph, 'to contain asset', 'Png');
                    expect(assetGraph, 'to contain assets', 'Html', 2);
                    expect(assetGraph, 'to contain relations', 'HtmlImage', 2);
                })
                .addPrecacheServiceWorker({isInitial: true}, {single: true})
                .queue(assetGraph => {
                    expect(assetGraph, 'to contain relation', 'JavaScriptServiceWorkerRegistration', 2);
                    expect(assetGraph, 'to contain relation', 'JavaScriptStaticUrl');
                    expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
                    expect(assetGraph, 'to contain asset', { url: assetGraph.root + 'path/to/index-otherpage-precache-service-worker.js' });
                    expect(assetGraph, 'to contain relations', {
                        to: { fileName: 'index-otherpage-precache-service-worker.js' }
                    }, 2);
                });
        });

        it('should create multiple service workers when when the participating HTML assets reside on different schemes', function () {
            const infoSpy = sinon.spy();
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPrecacheServiceWorker/multiPage/'})
                .on('info', infoSpy)
                .loadAssets('*.html')
                .populate()
                .queue(assetGraph => {
                    assetGraph.findAssets({fileName: 'index.html'})[0].url = 'https://example.com/blah.html';
                })
                .addPrecacheServiceWorker({isInitial: true}, {single: true})
                .queue(assetGraph => {
                    expect(assetGraph, 'to contain asset', { url: 'https://example.com/blah-precache-service-worker.js' });
                    expect(assetGraph, 'to contain asset', { url: `${assetGraph.root}otherpage-precache-service-worker.js` });
                })
                .then(() => expect(infoSpy, 'to have a call satisfying', () =>
                    infoSpy(new Error('addPrecacheServiceWorker: HTML assets reside on different domains or schemes, creating a service worker per origin'))
                ));
        });

        it('should create multiple service workers when when the participating HTML assets reside on different hosts', function () {
            const infoSpy = sinon.spy();
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPrecacheServiceWorker/multiPage/'})
                .on('info', infoSpy)
                .loadAssets('*.html')
                .populate()
                .queue(assetGraph => {
                    assetGraph.findAssets({fileName: 'index.html'})[0].url = 'https://example.com/blah.html';
                    assetGraph.findAssets({fileName: 'otherpage.html'})[0].url = 'https://yadda.com/foo.html';
                })
                .addPrecacheServiceWorker({isInitial: true}, {single: true})
                .queue(assetGraph => {
                    expect(assetGraph, 'to contain asset', { url: 'https://example.com/blah-precache-service-worker.js' });
                    expect(assetGraph, 'to contain asset', { url: 'https://yadda.com/foo-precache-service-worker.js' });
                })
                .then(() => expect(infoSpy, 'to have a call satisfying', () =>
                    infoSpy(new Error('addPrecacheServiceWorker: HTML assets reside on different domains or schemes, creating a service worker per origin'))
                ));
        });
    });
});
