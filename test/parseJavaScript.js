const expect = require('./unexpected-with-plugins');

const parse = require('../lib/parseJavaScript');

describe('parseJavascript', () => {
  it('should parse jsx', () => {
    expect(parse('<main>Hello world</main>'), 'to satisfy', {
      type: 'Program',
      body: [
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'JSXElement',
            openingElement: {
              type: 'JSXOpeningElement',
              start: 0,
              end: 6,
              attributes: [],
              name: { type: 'JSXIdentifier', start: 1, end: 5, name: 'main' },
              selfClosing: false,
            },
            closingElement: {
              type: 'JSXClosingElement',
              start: 17,
              end: 24,
              name: { type: 'JSXIdentifier', start: 19, end: 23, name: 'main' },
            },
            children: [
              {
                type: 'JSXText',
                start: 6,
                end: 17,
                value: 'Hello world',
                raw: 'Hello world',
              },
            ],
          },
        },
      ],
      tokens: [
        {
          type: {
            label: 'jsxTagStart',
          },
        },
        {
          type: {
            label: 'jsxName',
          },
          value: 'main',
        },
        {
          type: {
            label: 'jsxTagEnd',
          },
        },
        {
          type: {
            label: 'jsxText',
          },
          value: 'Hello world',
        },
        {
          type: {
            label: 'jsxTagStart',
          },
        },
        {
          type: {
            label: '/',
          },
        },
        {
          type: {
            label: 'jsxName',
          },
          value: 'main',
        },
        {
          type: {
            label: 'jsxTagEnd',
          },
        },
      ],
    });
  });

  it('should parse dynamic imports', () => {
    expect(
      parse('const foo = import("./foo.js")', {
        sourceType: 'module',
        ecmaVersion: 11,
      }),
      'to satisfy',
      {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            declarations: [
              {
                type: 'VariableDeclarator',
                init: {
                  type: 'ImportExpression',
                  source: {
                    type: 'Literal',
                    value: './foo.js',
                  },
                },
              },
            ],
          },
        ],
      }
    );
  });
});
