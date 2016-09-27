/*global Promise*/
module.exports = {
    fetch: function (load, fetch) {
        var matchAddress = load.address.match(/virtual-([^/]+)\.i18n$/);
        if (matchAddress) {
            var localeId = matchAddress[1];
            load.metadata.format = 'cjs';
            return new Promise(function (resolve, reject) {
                resolve('module.exports = "' + localeId + '";');
            });
        } else {
            throw new Error('Invalid config address: ' + matchAddress);
        }
    }
};
