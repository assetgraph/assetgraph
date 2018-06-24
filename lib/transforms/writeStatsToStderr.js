const _ = require('lodash');

function renderFileSize(numBytes) {
  if (numBytes < 1000) {
    return `${numBytes} bytes`;
  } else if (numBytes < 1000000) {
    return `${(numBytes / 1024).toFixed(1)} KB`;
  } else if (numBytes < 1000000000) {
    return `${(numBytes / 1048576).toFixed(1)} MB`;
  } else if (numBytes < 1000000000000) {
    return `${(numBytes / 1073741824).toFixed(1)} GB`;
  } else {
    return `${(numBytes / 1099511627776).toFixed(1)} TB`;
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

module.exports = queryObj => {
  return function writeStatsToStderr(assetGraph) {
    const countByDisplayType = {};
    const sumSizesByDisplayType = {};
    const allLoadedAssets = assetGraph.findAssets({
      ...queryObj,
      isInline: false,
      isLoaded: true,
      isRedirect: false
    });
    let totalSize = 0;

    for (const asset of allLoadedAssets) {
      let displayType = asset.type;
      if (!displayType && asset.extension) {
        displayType = asset.extension;
      }
      const size = asset.rawSrc.length;
      totalSize += size;
      sumSizesByDisplayType[displayType] =
        (sumSizesByDisplayType[displayType] || 0) + size;
      countByDisplayType[displayType] =
        (countByDisplayType[displayType] || 0) + 1;
    }
    const rows = [];
    const columnWidths = [];

    function addRow(...args) {
      const row = _.flatten(args);
      for (const [i, column] of row.entries()) {
        const length = column.toString().length;
        if (!columnWidths[i] || length > columnWidths[i]) {
          columnWidths[i] = length;
        }
      }
      rows.push(row);
    }

    for (const displayType of Object.keys(countByDisplayType)) {
      const count = countByDisplayType[displayType];
      addRow(
        displayType,
        count,
        renderFileSize(sumSizesByDisplayType[displayType]).split(' ')
      );
    }
    addRow(
      'Total:',
      allLoadedAssets.length,
      renderFileSize(totalSize).split(' ')
    );

    for (const row of rows) {
      console.warn(
        row
          .map((column, i) => {
            return (i === 3 ? rightPad : leftPad)(column, columnWidths[i]);
          })
          .join(' ')
      );
    }
  };
};
