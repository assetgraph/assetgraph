module.exports = {
    // fetch: sideeffect: load relevant parts of i18n file filtered by locale
    fetch: function (load, fetch) {
        var localeId = load.address.replace(/^.*-([^.]+)\.i18n$/, '$1');
        return "alert('" + localeId + "');";
    }
};
