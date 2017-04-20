var _ = require('lodash');

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
        str = '          '.substr(0, width - str.length) + str;
    }
    return str;
}

function rightPad(str, width) {
    str = str.toString();
    while (width > str.length) {
        str += '          '.substr(0, width - str.length);
    }
    return str;
}

module.exports = function (queryObj) {
    return function writeStatsToStderr(assetGraph) {
        var totalSize = 0,
            countByDisplayType = {},
            sumSizesByDisplayType = {},
            allLoadedAssets = assetGraph.findAssets(_.extend(queryObj || {}, {isInline: false, isLoaded: true}));

        allLoadedAssets.forEach(function (asset) {
            var displayType = asset.type;
            if (displayType === 'Asset' && asset.extension) {
                displayType = asset.extension;
            }
            var size = asset.rawSrc.length;
            totalSize += size;
            sumSizesByDisplayType[displayType] = (sumSizesByDisplayType[displayType] || 0) + size;
            countByDisplayType[displayType] = (countByDisplayType[displayType] || 0) + 1;
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

        _.each(countByDisplayType, function (count, type) {
            addRow(type, count, renderFileSize(sumSizesByDisplayType[type]).split(' '));
        });
        addRow('Total:', allLoadedAssets.length, renderFileSize(totalSize).split(' '));

        rows.forEach(function (row) {
            console.warn(row.map(function (column, i) {
                return (i === 3 ? rightPad : leftPad)(column, columnWidths[i]);
            }).join(' '));
        });
    };
};
