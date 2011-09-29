/*
 * ImageInfo 0.1.2 - A JavaScript library for reading image metadata.
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * MIT License [http://www.nihilogic.dk/licenses/mit-license.txt]
 *
 * Very quick port that works on node.js buffers by <andreas@one.com>
 */

function readPNGInfo(data) {
    var w = data.getLongAt(16, true),
        h = data.getLongAt(20, true),
        bpc = data.getByteAt(24),
        ct = data.getByteAt(25),
        alpha = data.getByteAt(25) >= 4,
        bpp = bpc;

    if (ct === 4) {
        bpp *= 2;
    }
    if (ct === 2) {
        bpp *= 3;
    }
    if (ct === 6) {
        bpp *= 4;
    }

    return {
        contentType: 'image/png',
        width: w,
        height: h,
        bpp: bpp,
        alpha: alpha
    };
}

function readGIFInfo(data) {
    var version = data.getStringAt(3, 3),
        w = data.getShortAt(6),
        h = data.getShortAt(8),
        bpp = ((data.getByteAt(10) >> 4) & 7) + 1;

    return {
        contentType: 'image/gif',
        version: version,
        width: w,
        height: h,
        bpp: bpp,
        alpha: false
    };
}

function readJPEGInfo(data) {
    var w = 0,
        h = 0,
        comps = 0,
        len = data.getLength(),
        offset = 2;
    while (offset < len) {
        var marker = data.getShortAt(offset, true);
        offset += 2;
        if (marker === 0xFFC0) {
            h = data.getShortAt(offset + 3, true);
            w = data.getShortAt(offset + 5, true);
            comps = data.getByteAt(offset + 7, true);
            break;
        } else {
            offset += data.getShortAt(offset, true);
        }
    }

    return {
        contentType: 'image/jpeg',
        width: w,
        height: h,
        bpp: comps * 8,
        alpha: false
    };
}

function readBMPInfo(data) {
    var w = data.getLongAt(18),
        h = data.getLongAt(22),
        bpp = data.getShortAt(28);

    return {
        contentType: 'image/bmp',
        width: w,
        height: h,
        bpp: bpp,
        alpha: false
    };
}

function readInfoFromData(data) {
    if (data.getByteAt(0) === 0xFF && data.getByteAt(1) === 0xD8) {
        return readJPEGInfo(data);
    }
    if (data.getByteAt(0) === 0x89 && data.getStringAt(1, 3) === "PNG") {
        return readPNGInfo(data);
    }
    if (data.getStringAt(0, 3) === "GIF") {
        return readGIFInfo(data);
    }
    if (data.getByteAt(0) === 0x42 && data.getByteAt(1) === 0x4D) {
        return readBMPInfo(data);
    }
    return null;
}

module.exports = function (buffers) {
    return readInfoFromData({
        getByteAt: function (iOffset) {
            var bufferNo = 0;
            while (bufferNo < buffers.length && iOffset > buffers[bufferNo].length) {
                iOffset -= buffers[bufferNo].length;
                bufferNo += 1;
            }
            if (iOffset < buffers[bufferNo].length) {
                return buffers[bufferNo][iOffset];
            }
        },
        getLength: function () {
            return buffers.reduce(function (sum, buffer) {
                return sum + buffer.length;
            }, 0);
        },
        getSByteAt: function (iOffset) {
            var iByte = this.getByteAt(iOffset);
            if (iByte > 127) {
                return iByte - 256;
            } else {
                return iByte;
            }
        },
        getShortAt: function (iOffset, bBigEndian) {
            var iShort = bBigEndian ?
                (this.getByteAt(iOffset) << 8) + this.getByteAt(iOffset + 1)
                : (this.getByteAt(iOffset + 1) << 8) + this.getByteAt(iOffset);
            if (iShort < 0) {
                iShort += 65536;
            }
            return iShort;
        },
        getSShortAt: function (iOffset, bBigEndian) {
            var iUShort = this.getShortAt(iOffset, bBigEndian);
            if (iUShort > 32767) {
                return iUShort - 65536;
            } else {
                return iUShort;
            }
        },
        getLongAt: function (iOffset, bBigEndian) {
            var iByte1 = this.getByteAt(iOffset),
                iByte2 = this.getByteAt(iOffset + 1),
                iByte3 = this.getByteAt(iOffset + 2),
                iByte4 = this.getByteAt(iOffset + 3);

            var iLong = bBigEndian ?
                (((((iByte1 << 8) + iByte2) << 8) + iByte3) << 8) + iByte4
                : (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1;
            if (iLong < 0) {
                iLong += 4294967296;
            }
            return iLong;
        },
        getSLongAt: function (iOffset, bBigEndian) {
            var iULong = this.getLongAt(iOffset, bBigEndian);
            if (iULong > 2147483647) {
                return iULong - 4294967296;
            } else {
                return iULong;
            }
        },
        getStringAt: function (iOffset, iLength) {
            var aStr = [];
            for (var i = iOffset, j = 0; i < iOffset + iLength ; i += 1, j += 1) {
                aStr[j] = String.fromCharCode(this.getByteAt(i));
            }
            return aStr.join("");
        }
    });
};
