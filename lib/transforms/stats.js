var _ = require('underscore'),
    query = require('../query');

function renderFileSize(numBytes) {
    if (numBytes < 1000) {
        return numBytes + ' bytes';
    } else if (numBytes < 1000000) {
        return (numBytes / 1024).toFixed(1) + ' KB';
    } else if (numBytes < 1000000000) {
        return (numBytes / 1048576).toFixed(1) + ' MB';
    } else if (numBytes < 1000000000000) {
        return (numBytes / 1073741824).toFixed(1) + ' GB';
    } else {
        return (numBytes / 1099511627776).toFixed(1) + ' TB';
    }
}

function leftPad(str, width) {
    str = str.toString();
    while (width > str.length) {
        str = "          ".substr(0, width - str.length) + str;
    }
    return str;
}

function rightPad(str, width) {
    str = str.toString();
    while (width > str.length) {
        str += "          ".substr(0, width - str.length);
    }
    return str;
}

module.exports = function (queryObj, heading) {
    return function stats(assetGraph) {
        if (!_.isUndefined(heading)) {
            console.log(heading);
        }
        var totalSize = 0,
            countByType = {},
            sumSizesByType = {},
            allAssets = assetGraph.findAssets(_.extend(queryObj || {}, {url: query.isDefined}));

        allAssets.forEach(function (asset) {
            var size = asset.rawSrc.length;
            totalSize += size;
            sumSizesByType[asset.type] = (sumSizesByType[asset.type] || 0) + size;
            countByType[asset.type] = (countByType[asset.type] || 0) + 1;
        });
        var rows = [],
            columnWidths = [];

        function addRow() { // ...
            var row = _.flatten(arguments);
            row.forEach(function (column, i) {
                if (!columnWidths[i] || column.toString().length > columnWidths[i]) {
                    columnWidths[i] = column.toString().length;
                }
            });
            rows.push(row);
        }

        _.each(countByType, function (count, type) {
            addRow(type, count, renderFileSize(sumSizesByType[type]).split(" "));
        });
        addRow("Total:", allAssets.length, renderFileSize(totalSize).split(" "));

        rows.forEach(function (row) {
            console.warn(row.map(function (column, i) {
                return (i === 3 ? rightPad : leftPad)(column, columnWidths[i]);
            }).join(" "));
        });
    };
};
