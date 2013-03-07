(function (root, factory) {
    if (typeof module !== "undefined") {
        module.exports = factory();
    } else if (typeof root.define === 'function' && define.amd) {
        define(['someDependency'], factory);
    } else {
        root.myModule = factory();
    }
}(this, function (someDependency) {
    return true;
}));
