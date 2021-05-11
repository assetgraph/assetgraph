const expect = require('../unexpected-with-plugins');
const determineFileType = require('../../lib/util/determineFileType');

describe('determineFileType', function () {
  it('should detect that a buffer contains a PNG', async function () {
    const fileType = await determineFileType(
      Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
      ])
    );

    expect(fileType, 'to equal', 'image/png');
  });
});
