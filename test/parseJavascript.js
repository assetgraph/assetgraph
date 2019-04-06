const matchSourceExpression = require('../lib/matchSourceExpression');
const expect = require('./unexpected-with-plugins');

const parse = require('../lib/parseJavascript');

describe('parseJavascript', () => {
  it('should parse jsx', () => {
    expect(parse('<main>Hello world</main>'), 'to satisfy', {
      type: 'Program',
      tokens: [
        {
          type: {
            label: 'jsxTagStart'
          }
        },
        {
          type: {
            label: 'jsxName'
          },
          value: 'main'
        },
        {
          type: {
            label: 'jsxTagEnd'
          }
        },
        {
          type: {
            label: 'jsxText'
          },
          value: 'Hello world'
        },
        {
          type: {
            label: 'jsxTagStart'
          }
        },
        {
          type: {
            label: '/'
          }
        },
        {
          type: {
            label: 'jsxName'
          },
          value: 'main'
        },
        {
          type: {
            label: 'jsxTagEnd'
          }
        }
      ]
    });
  });

  it('should parse dynamic imports', () => {
    expect(parse('const foo = import("./foo.js")', { sourceType: 'module' }), 'to satisfy', {
      type: 'Program'
    });
  })
});
