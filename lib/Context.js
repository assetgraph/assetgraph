var vm = require('vm');

function Context(assets, assetGraph) {
    this.vmContext = vm.createContext();
    this.vmContext.window = this.vmContext;
    this.assetGraph = this.vmContext.assetGraph = assetGraph;
    this.vmContext.console = console;
    this.vmContext.navigator = {userAgent: ''};
    this.vmContext.setTimeout = setTimeout; // Fake timers?
    this.assets = [];
    if (Array.isArray(assets)) {
        Array.prototype.push.apply(this.assets, assets);
    } else if (assets) {
        this.assets.push(assets);
    }
    this.assets.forEach(function (asset, i) {
        if (i === 0 && asset.type === 'Html') {
            this.vmContext.__defineSetter__('document', function () {});
            this.vmContext.__defineGetter__('document', function () {
                asset.markDirty();
                return asset.parseTree;
            });
            return;
        }
        this.run(asset);
    }, this);
}

Context.prototype.run = function (asset) {
    var vmContext = this.vmContext,
        src;

    if (asset.type === 'RequireJsConfig') {
        if (asset.isInline && asset.incomingRelations[0].isRequireVar) {
            if (vmContext.require) {
                this.emit('warn', new Error('Saw var require={...} config object after require.js'));
            } else {
                src = 'var require = ' + asset.text + ';';
            }
        } else {
            if (vmContext.require) {
                src = 'require.config(' + asset.parseTree.print_to_string() + ');';
            } else {
                this.emit('warn', new Error('Saw require.config({...}) or requirejs.config({...}) without require.js being detected'));
            }
        }
    } else if (asset.type === 'JavaScript' && asset.fileName === 'require.js') {
        src = asset.text;
    }
    if (src) {
        new vm.Script(src, asset.urlOrDescription).runInContext(vmContext);
    }
};

Context.prototype.cloneAndExpand = function (additionalAsset) {
    var assets = this.assets ? [].concat(this.assets) : [];
    if (Array.isArray(additionalAsset)) {
        Array.prototype.push.apply(assets, additionalAsset);
    } else if (additionalAsset) {
        assets.push(additionalAsset);
    }
    return new Context(assets, this.assetGraph);
};

module.exports = Context;
