# test/

The test suite. Every code change must ship with tests that follow the conventions below (see the coverage rule in the root `CLAUDE.md`). Tests run with `npm test` (mocha), a single file with `npx mocha test/<file>.js`.

Mocha config is `test/mocha.opts` (`--reporter spec --timeout 60000 --recursive --check-leaks --globals requirejsVars`), not a `.mocharc`. The repo pins mocha 6, where `mocha.opts` still works, so do not "modernize" it to a `.mocharc`. Mocha 6 auto-reads it even for a single-file run.

## Layout: mirror `lib/`

Test files mirror the source tree one-to-one:

- `test/assets/<Type>.js` for `lib/assets/<Type>.js`
- `test/relations/<Type>.js` for `lib/relations/<Type>.js`
- `test/transforms/<name>.js` for `lib/transforms/<name>.js`
- `test/<method>.js` for top-level `AssetGraph` methods (`findAssets.js`, `addAsset.js`, `constructor.js`, `TransformQueue.js`)

One test file per source subject, named identically to the source file. Two harness files sit at the test root: `test/unexpected-with-plugins.js` (the assertion library) and `test/unexpectedAssetGraph.js` (the custom assertions).

**Fixtures live in the top-level `testdata/`, not under `test/`.** They mirror the same structure: `testdata/<category>/<Subject>/<scenario>/`, where `<scenario>` is one camelCase folder per test case holding the input files (`index.html`, `index.css`, ...). Example: `testdata/transforms/bundleRelations/singleHtml/`, `testdata/assets/Css/parseErrors/`.

`testdata/` is large (~34MB) and is excluded from lint/format (`.eslintignore`, `.prettierignore`). Fixtures are byte-sensitive: many tests assert on exact serialized output, and some fixtures are intentionally malformed (e.g. `parseErrors/`). Never reformat, prettify, or lint-fix a fixture; edit it only to change what the test exercises.

The suite is large (146 files). Run the single mirrored file while iterating (`npx mocha test/<subject>.js`); reserve the full `npm test` for a final check. To iterate on one failing case, isolate it with `--grep`: `npx mocha test/<subject>.js --grep "<test title>"`. Do not use `it.only`/`describe.only` to isolate: `mocha/no-exclusive-tests` makes it a lint error, so it fails `npm run lint`/CI and the Stop hook's eslint gate will block the turn if a committed test still contains it.

To check coverage for just the file you changed while iterating, run `.claude/scripts/cover.sh <subject>` (e.g. `.claude/scripts/cover.sh relations/HtmlImage`). It runs the mirrored test under nyc scoped to `lib/<subject>.js` and prints that file's uncovered lines, so you don't need the full, slow `npm run coverage`. Use it directly rather than hand-rolling an `nyc` command: a naive scoped run trips mocha's `--check-leaks` on nyc's `__coverage__` global and reports a passing test as failing; the script handles that. For a top-level method test whose code lives elsewhere (e.g. `findAssets`), pass the lib path: `.claude/scripts/cover.sh findAssets lib/AssetGraph.js`.

## Assertion library: Unexpected, not chai/jest

Every file starts with the assertion import, path adjusted for depth:

```js
const expect = require('../../unexpected-with-plugins'); // from test/assets/, test/relations/, test/transforms/
```

That module is Unexpected with `unexpected-sinon`, `unexpected-dom`, `unexpected-set`, `magicpen-prism`, and the local `unexpectedAssetGraph.js`. Do not `require('unexpected')` directly, and do not use chai, jest, or `assert`.

Common built-in idioms actually used in this suite:

```js
expect(x, 'to equal', y);
expect(x, 'to be', y);              // and 'to be true', 'to be a number', 'to be an object'
expect(str, 'to contain', substr);
expect(arr, 'to have length', n);
expect(x, 'to satisfy', { ... });
expect(() => new AssetGraph({ canonicalRoot: true }), 'to throw', /must be a URL string/);
expect(promise, 'to be rejected with', new Error('...'));   // the async-error idiom
```

### Custom AssetGraph assertions (`test/unexpectedAssetGraph.js`)

These are the primary way to assert on graph contents. A string argument is shorthand for `{ type }`; a trailing number asserts a count. When a count of 1 matches, the assertion returns the found asset, so it can be awaited:

```js
expect(assetGraph, 'to contain asset', 'Html');
expect(assetGraph, 'to contain assets', { type: 'Css' }, 2);
expect(assetGraph, 'to contain no assets', { isInline: true });
expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
expect(assetGraph, 'to contain relation', { type: 'HtmlScript' });
expect(assetGraph, 'to contain no relations', 'HtmlAnchor');
expect(assetGraph, 'to contain urls', ['index.html', 'foo.css']);

const cssAsset = await expect(assetGraph, 'to contain asset', 'Css');
```

There is also `'to have the same AST as'` for comparing JavaScript by escodegen-normalized source.

## Building an AssetGraph under test

Two dominant shapes.

Fixture-backed (compute root from `__dirname`, load by relative filename, populate, await):

```js
const pathModule = require('path');
const AssetGraph = require('../../lib/AssetGraph');

const assetGraph = new AssetGraph({
  root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleRelations/singleHtml'),
});
await assetGraph.loadAssets('index.html').populate();
expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
```

In-memory (no fixtures, inline `text`/`url`):

```js
await assetGraph.loadAssets({ type: 'Html', text: '...', url: 'https://example.com/a' });
```

Compute `root` with `pathModule.resolve(__dirname, '../../testdata/...')`. `loadAssets` takes relative filenames or globs resolved against `root`. Chain `.populate()` (with options like `.populate({ followRelations: { crossdomain: false } })` when needed) before querying relations, since only populated assets expose them.

## Structure and naming

- Outer `describe` is the subject path relative to `lib/`: `describe('assets/Css', ...)`, `describe('relations/HtmlImage', ...)`, `describe('transforms/bundleRelations', ...)`. Top-level method tests use `describe('AssetGraph#addAsset', ...)` / `describe('AssetGraph.findAssets', ...)`.
- Nested `describe`s group by member or scenario, prefixed `#member` for instance members or `.method`: `describe('#decoding', ...)`, `describe('#attach', ...)`.
- `it` descriptions read "should ..." and state observable behaviour: `it('should bundle two stylesheets', ...)`.
- Mocha callbacks are anonymous `function () {}` / `async function () {}`, not arrow functions. Titles must be unique within a scope (`mocha/no-identical-title` is an error).

## Async

async/await is the dominant style, and there are no `done` callbacks anywhere. Do not introduce them. `it('...', async function () { await assetGraph.loadAssets(...).populate(); expect(...); })`. For rejection assertions the alternative is returning the promise: `return expect(theQueue, 'to be rejected with', new Error('...'))`.

## Warnings and sinon

`assetGraph.warn()` throws if nothing is listening, so any path that may warn needs a `warn` listener attached before `loadAssets`. Use a per-suite sinon sandbox and assert with `unexpected-sinon`:

```js
const sinon = require('sinon');
let sandbox;
beforeEach(function () { sandbox = sinon.createSandbox(); });
afterEach(function () { sandbox.restore(); });

it('should warn about the parse error', async function () {
  const warnSpy = sandbox.spy().named('warn');
  await new AssetGraph({ root: ... })
    .on('warn', warnSpy)
    .loadAssets('parseErrorInInlineCss.html');

  expect(warnSpy, 'to have calls satisfying', () => {
    warnSpy(/parseErrorInInlineCss\.html/);
  });
});
```

To assert that a path does not warn, attach a spy and assert it was not called. `sandbox.spy(obj, 'method')` spies on instance methods (e.g. `sandbox.spy(asset, 'markDirty')`). HTTP tests mock declaratively with `httpception`.

## Rules that fail the build

- `--check-leaks`: a leaked global fails the run. Declare everything with `const`/`let`; the only whitelisted global is `requirejsVars`.
- `mocha/no-exclusive-tests`: a committed `.only` is a lint error. Never commit `describe.only`/`it.only`.
- `mocha/no-nested-tests`: no `it` inside `it`.
- `prefer-const` and `prefer-template` are errors: use `const` and template literals, never `var` or string concatenation.
- Prettier (`--check`) must pass: 2-space indent, single quotes, semicolons, trailing commas.
- `--timeout` is 60s globally; do not add per-test timeouts unless a test genuinely needs longer.

## Files to imitate

`test/findAssets.js` (in-memory + custom assertions), `test/transforms/bundleRelations.js` (fixture-backed setup), `test/assets/Css.js` (sinon sandbox + warn spy), `test/relations/HtmlImage.js` (`beforeEach` + nested describes), `test/TransformQueue.js` (promise-returning rejection assertions), and `test/unexpectedAssetGraph.js` for the custom assertion vocabulary.
