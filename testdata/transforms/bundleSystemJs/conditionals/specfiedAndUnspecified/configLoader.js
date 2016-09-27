/*global Promise*/
module.exports = {
    fetch: function (load, fetch) {
        var matchAddress = load.address.match(/virtual-([^/]+)\.configjson$/);
        if (matchAddress) {
            var environment = matchAddress[1];
            load.metadata.format = 'cjs';
            return new Promise(function (resolve, reject) {
                resolve('module.exports = "' + environment + '";');
            });
        } else {
            throw new Error('Invalid config address: ' + matchAddress);
        }
    }
};
