const _ = require('lodash');
const defaultStylesheets = require('./defaultStylesheets');
const stylePropObjectComparator = require('./stylePropObjectComparator');
const unquote = require('./unquote');
const memoizeSync = require('memoizesync');
const capitalize = require('capitalize');
const cssPseudoElementRegExp = require('../cssPseudoElementRegExp');
const stripPseudoClassesFromSelector = require('./stripPseudoClassesFromSelector');
const gatherStylesheetsWithPredicates = require('./gatherStylesheetsWithPredicates');
const getCssRulesByProperty = require('./getCssRulesByProperty');
const extractTextFromContentPropertyValue = require('./extractTextFromContentPropertyValue');
const counterRendererByListStyleType = require('./counterRendererByListStyleType');
const unescapeCssString = require('./unescapeCssString');
const getCounterCharacters = require('./getCounterCharacters');
const expandPermutations = require('../expandPermutations');
const combinePredicates = require('./combinePredicates');
const arePredicatesExhaustive = require('../arePredicatesExhaustive');
const initialValueByProp = require('./initialValueByProp');
const expandCustomProperties = require('./expandCustomProperties');
const normalizeFontPropertyValue = require('./normalizeFontPropertyValue');
const cssFontParser = require('css-font-parser');

const FONT_PROPS = ['font-family', 'font-style', 'font-weight'];

const CSS_PROPS_TO_TRACE = [
  ...FONT_PROPS,
  'content',
  'quotes',
  'list-style-type',
  'display',
  'animation-name',
  'text-transform',
  'transition-property',
  'transition-duration',
  'counter-increment',
  'counter-reset',
  'counter-set',
  'white-space'
];

const CSS_PROPS_TO_TRACE_AND_TEXT = ['text', ...CSS_PROPS_TO_TRACE];

const INHERITED = {
  'font-family': true,
  'font-weight': true,
  'font-style': true,
  content: false,
  quotes: true,
  'list-style-type': true,
  display: false,
  'animation-name': false,
  'text-transform': true,
  'transition-property': false,
  'transition-duration': false,
  'counter-increment': false,
  'counter-reset': false,
  'white-space': true
};

function createPredicatePermutations(predicatesToVary, predicates, i) {
  if (typeof i !== 'number') {
    i = 0;
  }
  if (i < predicatesToVary.length) {
    const permutations = [];
    for (const permutation of createPredicatePermutations(
      predicatesToVary,
      predicates,
      i + 1
    )) {
      const permutationWithPredicateOff = { ...permutation };
      let predicateValue = predicates[predicatesToVary[i]];
      if (typeof predicateValue === 'undefined') {
        predicateValue = true;
      }
      permutationWithPredicateOff[predicatesToVary[i]] = predicateValue;
      permutations.push(permutation, permutationWithPredicateOff);
    }
    return permutations;
  } else {
    return [{}];
  }
}

const excludedNodes = ['HEAD', 'STYLE', 'SCRIPT'];

function getFontRulesWithDefaultStylesheetApplied(
  htmlAsset,
  memoizedGetCssRulesByProperty
) {
  const fontPropRules = [
    ...defaultStylesheets,
    ...gatherStylesheetsWithPredicates(htmlAsset.assetGraph, htmlAsset)
  ]
    .map(stylesheetAndIncomingMedia =>
      memoizedGetCssRulesByProperty(
        CSS_PROPS_TO_TRACE,
        stylesheetAndIncomingMedia.text,
        stylesheetAndIncomingMedia.predicates
      )
    )
    .reduce((rules, current) => {
      // Input:
      // [
      //   {
      //     'font-style': [],
      //     'font-weight': [],
      //     'font-family': []
      //   },
      //   {
      //     'font-style': [],
      //     'font-weight': [],
      //     'font-family': []
      //   },
      //   {
      //     'font-style': [],
      //     'font-weight': [],
      //     'font-family': []
      //   }
      // ]

      // Output:
      // {
      //   'font-style': [[], [], []],
      //   'font-weight': [[], [], []],
      //   'font-family': [[], [], []]
      // }
      for (const prop of Object.keys(current)) {
        if (!rules[prop]) {
          rules[prop] = [];
        }

        rules[prop] = [...rules[prop], ...current[prop]];
      }

      return rules;
    }, {});

  for (const prop of Object.keys(fontPropRules)) {
    fontPropRules[prop].sort(stylePropObjectComparator(fontPropRules[prop]));
  }

  return fontPropRules;
}

function getMemoizedElementStyleResolver(
  fontPropRules,
  memoizedGetCssRulesByProperty
) {
  const nonInheritingTags = ['BUTTON', 'INPUT', 'OPTION', 'TEXTAREA'];

  const cssPropsAndCustomPropsToTrace = [
    ...CSS_PROPS_TO_TRACE,
    ...Object.keys(fontPropRules).filter(prop => /^--/.test(prop))
  ];

  const getComputedStyle = memoizeSync(
    (node, idArray, pseudoElementName, parentTrace, predicates) => {
      predicates = predicates || {};
      const localFontPropRules = { ...fontPropRules };
      const result = {};

      // Stop condition. We moved above <HTML>
      if (!node.tagName) {
        for (const prop of cssPropsAndCustomPropsToTrace) {
          result[prop] = [
            { value: initialValueByProp[prop], predicates, prop }
          ];
        }
        return result;
      }

      if (node.getAttribute('style')) {
        const attributeStyles = memoizedGetCssRulesByProperty(
          cssPropsAndCustomPropsToTrace,
          `bogusselector { ${node.getAttribute('style')} }`,
          [],
          []
        );

        for (const prop of Object.keys(attributeStyles)) {
          if (attributeStyles[prop].length > 0) {
            const concatRules = [
              ...attributeStyles[prop],
              ...localFontPropRules[prop]
            ];
            localFontPropRules[prop] = concatRules.sort(
              stylePropObjectComparator(concatRules)
            );
          }
        }
      }

      let foundPseudoElement = false;

      function traceProp(prop, startIndex, predicates) {
        startIndex = startIndex || 0;
        const propDeclarations = localFontPropRules[prop] || [];
        for (let i = startIndex; i < propDeclarations.length; i += 1) {
          const declaration = propDeclarations[i];
          // Skip to the next rule if we are doing a trace where one of true predicates is already assumed false,
          // or one of the false predicates is already assumed true:
          if (
            Object.keys(declaration.predicates).some(
              predicate =>
                typeof predicates[predicate] === 'boolean' &&
                declaration.predicates[predicate] !== predicates[predicate]
            )
          ) {
            continue;
          }

          // Style attributes always have a specificity array of [1, 0, 0, 0]
          const isStyleAttribute = declaration.specificityArray[0] === 1;
          let strippedSelector =
            !isStyleAttribute &&
            stripPseudoClassesFromSelector(declaration.selector);
          const hasPseudoClasses = strippedSelector !== declaration.selector;
          let hasPseudoElement = false;

          if (!isStyleAttribute) {
            const matchPseudoElement = strippedSelector.match(
              /^(.*?)::?(before|after|first-letter|first-line|placeholder)$/i
            );
            if (matchPseudoElement) {
              hasPseudoElement = true;
              // The selector ends with :before, :after, :first-letter, or :first-line
              if (pseudoElementName === matchPseudoElement[2].toLowerCase()) {
                strippedSelector = matchPseudoElement[1];
              } else {
                // We're not currently tracing this pseudo element, skip this rule
                continue;
              }
            }
          }

          // Check for unsupported pseudo element, eg. select:-internal-list-box optgroup option
          if (
            !isStyleAttribute &&
            strippedSelector.match(cssPseudoElementRegExp)
          ) {
            continue;
          }

          if (
            !prop.startsWith('--') &&
            !INHERITED[prop] &&
            !hasPseudoElement &&
            pseudoElementName
          ) {
            continue;
          }
          if (
            isStyleAttribute ||
            (!strippedSelector || node.matches(strippedSelector))
          ) {
            if (hasPseudoElement) {
              foundPseudoElement = true;
            }
            let hypotheticalValues;
            if (
              declaration.value === 'inherit' ||
              declaration.value === 'unset'
            ) {
              hypotheticalValues = (parentTrace ||
                getComputedStyle(
                  node.parentNode,
                  idArray.slice(0, -1),
                  undefined,
                  undefined,
                  predicates
                ))[prop];
            } else if (
              prop === 'font-weight' &&
              (declaration.value === 'lighter' ||
                declaration.value === 'bolder')
            ) {
              hypotheticalValues = (parentTrace ||
                getComputedStyle(
                  node.parentNode,
                  idArray.slice(0, -1),
                  undefined,
                  undefined,
                  predicates
                ))[prop].map(inheritedHypotheticalValue => ({
                prop: inheritedHypotheticalValue.prop,
                value: `${inheritedHypotheticalValue.value}+${
                  declaration.value
                }`,
                predicates: inheritedHypotheticalValue
              }));
            } else {
              let value;
              if (declaration.value === 'initial') {
                value = initialValueByProp[prop];
              } else if (prop !== 'content' || hasPseudoElement) {
                // content: ... is not inherited, has to be applied directly to the pseudo element
                value = declaration.value;
              }

              hypotheticalValues = [
                { prop: declaration.prop, value, predicates }
              ];
            }

            const predicatesToVary = Object.keys(declaration.predicates);
            if (!isStyleAttribute && hasPseudoClasses) {
              predicatesToVary.push(
                `selectorWithPseudoClasses:${declaration.selector}`
              );
            }
            if (predicatesToVary.length > 0) {
              const multipliedHypotheticalValues = [];
              for (const predicatePermutation of createPredicatePermutations(
                predicatesToVary,
                declaration.predicates
              )) {
                const predicatePermutationKeys = Object.keys(
                  predicatePermutation
                );
                if (predicatePermutationKeys.length === 0) {
                  continue;
                }
                const predicatesForThisPermutation = combinePredicates([
                  predicates,
                  predicatePermutation
                ]);
                const predicatesOtherwise = combinePredicates([
                  predicates,
                  _.mapValues(predicatePermutation, value => !value)
                ]);
                if (
                  predicatesForThisPermutation &&
                  Object.keys(declaration.predicates).every(
                    predicate =>
                      declaration.predicates[predicate] ===
                      predicatesForThisPermutation[predicate]
                  )
                ) {
                  multipliedHypotheticalValues.push(
                    ...hypotheticalValues.map(hypotheticalValue => ({
                      prop: hypotheticalValue.prop,
                      value: hypotheticalValue.value,
                      predicates: predicatesForThisPermutation
                    }))
                  );
                }
                if (predicatesOtherwise) {
                  multipliedHypotheticalValues.push(
                    ...traceProp(prop, i + 1, predicatesOtherwise)
                  );
                }
              }
              hypotheticalValues = multipliedHypotheticalValues;
            }
            return hypotheticalValues;
          }
        }
        if (!nonInheritingTags.includes(node.tagName)) {
          return (parentTrace ||
            getComputedStyle(
              node.parentNode,
              idArray.slice(0, -1),
              undefined,
              undefined,
              predicates
            ))[prop];
        } else {
          return [{ prop, value: initialValueByProp[prop], predicates }];
        }
      }

      for (const prop of cssPropsAndCustomPropsToTrace) {
        result[prop] = traceProp(prop, 0, predicates);
      }
      if (pseudoElementName && !foundPseudoElement) {
        // We're tracing a pseudo element, but didn't match any rules
        return;
      }
      return result;
    },
    {
      argumentsStringifier(args) {
        // node, idArray, pseudoElementName, parentTrace, predicates
        if (args[3]) {
          // Bypass memoization if parentTrace is given
          return false;
        }
        return `${args[1].join(',')}\x1e${
          args[4]
            ? Object.keys(args[4])
                .map(key => `${key}\x1d${args[4][key]}`)
                .join('\x1d')
            : ''
        }${args[2] || ''}`;
      }
    }
  );

  return getComputedStyle;
}

function expandAnimations(computedStyle, keyframesDefinitions) {
  if (computedStyle['animation-name'].length > 0) {
    const isAnimatedByPropertyName = { 'animation-name': true };
    for (const animationNameValue of computedStyle['animation-name']) {
      for (const keyframesDefinition of keyframesDefinitions) {
        if (keyframesDefinition.name === animationNameValue.value) {
          keyframesDefinition.node.walkDecls(decl => {
            if (
              /^--/.test(decl.prop) ||
              CSS_PROPS_TO_TRACE.includes(decl.prop)
            ) {
              isAnimatedByPropertyName[decl.prop] = true;
            }
          });
        }
      }
    }
    const animatedPropertyNames = Object.keys(isAnimatedByPropertyName);
    if (animatedPropertyNames.length > 0) {
      // Create a 1-level deep copy with new value arrays so we can add more items
      // without mutating the caller's copy:
      computedStyle = Object.keys(computedStyle).reduce(
        // eslint-disable-next-line no-sequences
        (acc, prop) => ((acc[prop] = [...computedStyle[prop]]), acc),
        {}
      );
      const extraValuesByProp = {};
      for (const permutation of expandPermutations(
        computedStyle,
        animatedPropertyNames
      )) {
        if (permutation['animation-name'].value !== 'none') {
          for (const keyframesDefinition of keyframesDefinitions) {
            if (
              keyframesDefinition.name === permutation['animation-name'].value
            ) {
              const seenValuesByProp = {};
              for (const prop of Object.keys(permutation)) {
                seenValuesByProp[prop] = [permutation[prop].value];
              }
              keyframesDefinition.node.walkDecls(decl => {
                if (
                  /^--/.test(decl.prop) ||
                  CSS_PROPS_TO_TRACE.includes(decl.prop)
                ) {
                  seenValuesByProp[decl.prop].push(decl.value);
                }
              });
              for (const prop of Object.keys(seenValuesByProp)) {
                let values = seenValuesByProp[prop];
                if (prop === 'font-weight') {
                  // https://drafts.csswg.org/css-transitions/#animtype-font-weight
                  const sortedValues = values
                    .map(value =>
                      normalizeFontPropertyValue('font-weight', value)
                    )
                    .sort();
                  values = [];
                  for (
                    let fontWeight = sortedValues[0];
                    fontWeight <= sortedValues[sortedValues.length - 1];
                    fontWeight += 100
                  ) {
                    values.push(String(fontWeight));
                  }
                }
                for (const value of values) {
                  (extraValuesByProp[prop] =
                    extraValuesByProp[prop] || []).push({
                    prop,
                    value,
                    predicates: permutation['animation-name'].predicates
                  });
                }
              }
            }
          }
        }
      }
      for (const prop of Object.keys(extraValuesByProp)) {
        computedStyle[prop].push(...extraValuesByProp[prop]);
      }
    }
  }
  return computedStyle;
}

function expandTransitions(computedStyle) {
  const fontWeightTransitions = computedStyle['transition-property'].filter(
    hypotheticalValue => /\b(?:font-weight|all)\b/.test(hypotheticalValue.value)
  );
  if (fontWeightTransitions.length > 0) {
    const hypotheticalFontWeightValuesInPseudoClassStates = computedStyle[
      'font-weight'
    ].filter(hypotheticalValue =>
      Object.keys(hypotheticalValue.predicates).some(
        predicate =>
          hypotheticalValue.predicates[predicate] &&
          /^selectorWithPseudoClasses:/.test(predicate)
      )
    );
    if (hypotheticalFontWeightValuesInPseudoClassStates.length > 0) {
      const hypotheticalNonZeroTransitionDurations = computedStyle[
        'transition-duration'
      ].filter(
        hypotheticalValue =>
          !/^\s*0s\s*(,\s*0s\s*)*$/.test(hypotheticalValue.value)
      );
      if (hypotheticalNonZeroTransitionDurations.length > 0) {
        const extraHypotheticalFontWeightValues = [];
        for (const transitionDuration of hypotheticalNonZeroTransitionDurations) {
          for (const fontWeightTransition of fontWeightTransitions) {
            for (const hypotheticalFontWeightValueInPseudoClassStates of hypotheticalFontWeightValuesInPseudoClassStates) {
              for (const hypotheticalFontWeightValue of computedStyle[
                'font-weight'
              ]) {
                const fontWeightEndPoints = [
                  hypotheticalFontWeightValue.value,
                  hypotheticalFontWeightValueInPseudoClassStates.value
                ].map(value =>
                  normalizeFontPropertyValue('font-weight', value)
                );
                for (
                  let fontWeight = Math.min(...fontWeightEndPoints) + 100;
                  fontWeight < Math.max(...fontWeightEndPoints);
                  fontWeight += 100
                ) {
                  // Explicitly don't include hypotheticalFontWeightValueInPseudoClassStates.predicates
                  const combinedPredicates = combinePredicates([
                    transitionDuration.predicates,
                    fontWeightTransition.predicates,
                    hypotheticalFontWeightValue.predicates
                  ]);
                  if (combinedPredicates) {
                    extraHypotheticalFontWeightValues.push({
                      prop: 'font-weight',
                      value: String(fontWeight),
                      predicates: combinedPredicates
                    });
                  }
                }
              }
            }
          }
        }
        if (extraHypotheticalFontWeightValues.length > 0) {
          // Create a shallow copy and add the extra hypothetical font-weight values
          computedStyle = { ...computedStyle };
          computedStyle['font-weight'] = [
            ...computedStyle['font-weight'],
            ...extraHypotheticalFontWeightValues
          ];
        }
      }
    }
  }
  return computedStyle;
}

function expandListIndicators(
  computedStyle,
  counterStyles,
  possibleListItemNumbers
) {
  computedStyle.text = computedStyle.text || [];
  for (let i = 0; i < computedStyle.display.length; i += 1) {
    if (/\blist-item\b/.test(computedStyle.display[i].value)) {
      for (let j = 0; j < computedStyle['list-style-type'].length; j += 1) {
        const listStyleType = computedStyle['list-style-type'][j].value;
        const predicates = combinePredicates([
          computedStyle.display[i].predicates,
          computedStyle['list-style-type'][j].predicates
        ]);
        if (predicates) {
          if (/^['"]/.test(listStyleType)) {
            computedStyle.text.push({
              value: unescapeCssString(unquote(listStyleType)),
              isListIndicator: true,
              predicates
            });
          } else {
            let found = false;
            for (const counterStyle of counterStyles) {
              if (counterStyle.name === listStyleType) {
                const combinedPredicates = combinePredicates([
                  predicates,
                  counterStyle.predicates
                ]);
                if (combinedPredicates) {
                  found = true;
                  computedStyle.text.push({
                    value: getCounterCharacters(
                      counterStyle,
                      counterStyles,
                      possibleListItemNumbers
                    ),
                    isListIndicator: true,
                    predicates: combinedPredicates
                  });
                }
              }
            }
            if (!found) {
              computedStyle.text.push({
                value: possibleListItemNumbers
                  .map(
                    listItemNumber =>
                      `${counterRendererByListStyleType[listStyleType](
                        listItemNumber
                      )}.`
                  )
                  .join(''),
                isListIndicator: true,
                predicates
              });
            }
          }
        }
      }
    }
  }
  return _.omit(computedStyle, '');
}

// null represents <br>
function normalizeTextNodeValues(textNodeValues, whiteSpaceValue) {
  return textNodeValues
    .map(
      textNodeValue =>
        textNodeValue === null
          ? '\n'
          : /^pre/i.test(whiteSpaceValue)
            ? textNodeValue
            : textNodeValue.replace(/\n/g, ' ')
    )
    .join('');
}

// memoizedGetCssRulesByProperty is optional
function getTextByFontProperties(htmlAsset, memoizedGetCssRulesByProperty) {
  if (!htmlAsset || htmlAsset.type !== 'Html' || !htmlAsset.assetGraph) {
    throw new Error('htmlAsset must be a Html-asset and be in an assetGraph');
  }

  memoizedGetCssRulesByProperty =
    memoizedGetCssRulesByProperty || getCssRulesByProperty;

  const fontPropRules = getFontRulesWithDefaultStylesheetApplied(
    htmlAsset,
    memoizedGetCssRulesByProperty
  );
  const getComputedStyle = getMemoizedElementStyleResolver(
    fontPropRules,
    memoizedGetCssRulesByProperty
  );

  const hypotheticalCounterStylesByName = {};
  for (const counterStyle of fontPropRules.counterStyles) {
    (hypotheticalCounterStylesByName[counterStyle.name] =
      hypotheticalCounterStylesByName[counterStyle.name] || []).push({
      value: counterStyle.props,
      predicates: counterStyle.predicates
    });
  }

  const document = htmlAsset.parseTree;

  const visualValueInputTypes = [
    'date',
    'datetime-local',
    'email',
    'month',
    'number',
    'reset',
    'search',
    'submit',
    'tel',
    'text',
    'time',
    'url',
    'week'
  ];

  const possibleNextListItemNumberStack = [[1]];
  let possibleCounterValuesByName = {};

  function adjustPossibleCountersAndListItemNumbers(
    computedStyle,
    isWithinConditionalCommentOrNoscript
  ) {
    let numHypotheticalListItems = 0;
    for (const hypotheticalDisplayValue of computedStyle.display) {
      if (/\blist-item\b/.test(hypotheticalDisplayValue.value)) {
        numHypotheticalListItems += 1;
      }
    }
    let nextPossibleCounterValuesByName = {};
    for (const propertyName of ['counter-reset', 'counter-set']) {
      const values = _.uniq(
        computedStyle[propertyName].map(
          hypotheticalCounterResetValue => hypotheticalCounterResetValue.value
        )
      );
      for (const value of values) {
        const valueByCounterName = {};
        if (value !== 'none') {
          const tokens = value.split(/\s+/);
          for (let i = 0; i < tokens.length; i += 1) {
            const counterName = tokens[i];
            let resetValue = 0;
            if (/^-?\d+$/.test(tokens[i + 1])) {
              resetValue = parseInt(tokens[i + 1], 10);
              i += 1;
            }
            valueByCounterName[counterName] = resetValue;
          }
        }
        for (const counterName of Object.keys(valueByCounterName)) {
          for (const possibleCounterValue of possibleCounterValuesByName[
            counterName
          ] || [0]) {
            (nextPossibleCounterValuesByName[counterName] =
              nextPossibleCounterValuesByName[counterName] || []).push(
              valueByCounterName[counterName] + possibleCounterValue
            );
          }
        }
        for (const counterName of Object.keys(possibleCounterValuesByName)) {
          if (!valueByCounterName[counterName]) {
            nextPossibleCounterValuesByName[counterName] = [
              ...possibleCounterValuesByName[counterName]
            ];
          }
        }
      }
    }

    possibleCounterValuesByName = nextPossibleCounterValuesByName;
    nextPossibleCounterValuesByName = {};

    const counterIncrementValues = _.uniq(
      computedStyle['counter-increment'].map(
        hypotheticalCounterIncrementValue =>
          hypotheticalCounterIncrementValue.value
      )
    );
    const counterIncrementsByName = {};
    for (const counterIncrementValue of counterIncrementValues) {
      if (counterIncrementValue !== 'none') {
        const tokens = counterIncrementValue.split(/\s+/);
        for (let i = 0; i < tokens.length; i += 1) {
          const counterName = tokens[i];
          let increment = 1;
          if (/^-?\d+$/.test(tokens[i + 1])) {
            increment = parseInt(tokens[i + 1], 10);
            i += 1;
          }
          (counterIncrementsByName[counterName] =
            counterIncrementsByName[counterName] || []).push(increment);
        }
      }
    }
    for (const counterName of Object.keys(counterIncrementsByName)) {
      for (const possibleCounterValue of possibleCounterValuesByName[
        counterName
      ] || [0]) {
        for (const counterIncrement of counterIncrementsByName[counterName]) {
          (nextPossibleCounterValuesByName[counterName] =
            nextPossibleCounterValuesByName[counterName] || []).push(
            possibleCounterValue + counterIncrement
          );
        }
      }
    }
    for (const counterName of Object.keys(possibleCounterValuesByName)) {
      if (!counterIncrementsByName[counterName]) {
        nextPossibleCounterValuesByName[counterName] = [
          ...possibleCounterValuesByName[counterName]
        ];
      }
    }
    possibleCounterValuesByName = nextPossibleCounterValuesByName;
    for (const counterName of Object.keys(possibleCounterValuesByName)) {
      possibleCounterValuesByName[counterName] = _.uniq(
        possibleCounterValuesByName[counterName]
      );
    }
    if (numHypotheticalListItems > 0) {
      if (
        numHypotheticalListItems === computedStyle.display.length &&
        !isWithinConditionalCommentOrNoscript
      ) {
        possibleNextListItemNumberStack[
          possibleNextListItemNumberStack.length - 1
        ] = possibleNextListItemNumberStack[
          possibleNextListItemNumberStack.length - 1
        ].map(
          potentialPrecedingListItemCount => potentialPrecedingListItemCount + 1
        );
      } else {
        possibleNextListItemNumberStack[
          possibleNextListItemNumberStack.length - 1
        ] = _.uniq([
          ...possibleNextListItemNumberStack[
            possibleNextListItemNumberStack.length - 1
          ],
          ...possibleNextListItemNumberStack[
            possibleNextListItemNumberStack.length - 1
          ].map(
            potentialPrecedingListItemCount =>
              potentialPrecedingListItemCount + 1
          )
        ]);
      }
    }
    return computedStyle;
  }

  const conditionalCommentStack = [];
  const noscriptStack = [];

  function expandComputedStyle(computedStyle) {
    return expandListIndicators(
      expandCustomProperties(
        expandTransitions(
          expandAnimations(computedStyle, fontPropRules.keyframes)
        )
      ),
      fontPropRules.counterStyles,
      possibleNextListItemNumberStack[
        possibleNextListItemNumberStack.length - 1
      ]
    );
  }

  function traceBeforeOrAfterPseudoElement(pseudoElementName, node, idArray) {
    const styledTexts = [];
    let computedStyle = getComputedStyle(node, idArray, pseudoElementName);
    if (computedStyle) {
      computedStyle = expandComputedStyle({ ...computedStyle });
      const expandedContents = [];
      // Multiply the hypothetical content values with the hypothetical quotes values:
      for (const hypotheticalContent of computedStyle.content) {
        const hypotheticalValues = extractTextFromContentPropertyValue(
          hypotheticalContent.value,
          node,
          computedStyle.quotes,
          hypotheticalCounterStylesByName,
          possibleCounterValuesByName
        );
        for (const hypotheticalValue of hypotheticalValues) {
          hypotheticalValue.predicates = combinePredicates([
            hypotheticalValue.predicates,
            hypotheticalContent.predicates
          ]);
          if (hypotheticalValue.predicates) {
            expandedContents.push(hypotheticalValue);
          }
        }
      }
      computedStyle.text = expandedContents;
      const styledText = adjustPossibleCountersAndListItemNumbers(
        computedStyle,
        conditionalCommentStack.length > 0 || noscriptStack.length > 0
      );
      styledText.text = styledText.text.filter(
        hypotheticalText => hypotheticalText.value.length > 0
      );
      if (styledText.text.length > 0) {
        styledTexts.push(styledText);
      }
      return styledTexts;
    }
  }

  function expandFirstLineAndFirstLetter(groupedStyledTexts, node, idArray) {
    for (const pseudoElementName of ['first-line', 'first-letter']) {
      const additionalStyledTexts = [];
      // Whether there's a perfect overlap between the predicates of the existing styled texts we've "taken bites" of:
      let aligned = true;
      groupedStyledTexts.some(styledTextsInSection => {
        let allExhaustive = false;
        // Keep track of whether we have consumed all the required characters:
        let done = true;
        for (let i = 0; i < styledTextsInSection.length; i += 1) {
          const styledTextInSection = styledTextsInSection[i];
          const thisExhaustive = Object.keys(styledTextInSection).every(prop =>
            arePredicatesExhaustive(
              styledTextInSection[prop].map(
                hypotheticalValue => hypotheticalValue.predicates
              )
            )
          );
          allExhaustive = allExhaustive || thisExhaustive;

          const pseudoElementStyle = getComputedStyle(
            node,
            idArray.slice(0, -1),
            pseudoElementName,
            styledTextInSection
          );
          if (pseudoElementStyle) {
            for (const hypotheticalValue of styledTextInSection.text) {
              let matchContent;
              if (pseudoElementName === 'first-letter') {
                matchContent = hypotheticalValue.value.match(
                  /^(\s*"?\s*\w|\s*"\s*\w?)/
                );
              } else {
                // pseudoElementName === 'first-line'
                matchContent = hypotheticalValue.value.match(/^([^\n]+)/);
                done = false;
              }
              if (matchContent) {
                const content = matchContent[1];
                additionalStyledTexts.push({
                  text: [
                    {
                      value: content,
                      predicates: hypotheticalValue.predicates
                    }
                  ],
                  ...pseudoElementStyle
                });
                if (aligned) {
                  if (pseudoElementName === 'first-letter') {
                    hypotheticalValue.value = hypotheticalValue.value.substr(
                      content.length
                    );
                  } else if (pseudoElementName === 'first-line') {
                    done = hypotheticalValue.value.includes('\n');
                  }
                }
              } else {
                done = false;
              }
            }
          }
        }
        if (allExhaustive && done) {
          // Short circuit -- no need to proceed to the next section
          return true;
        } else if (!done) {
          aligned = false;
        }
      });
      groupedStyledTexts[0].unshift(...additionalStyledTexts);
    }
  }

  const styledTexts = [];

  (function traversePreOrder(node, idArray) {
    const textNodeValues = [];
    if (node.nodeType === node.TEXT_NODE) {
      const textContent = node.nodeValue
        .replace(/⋖\d+⋗/g, templatePlaceholder => {
          if (htmlAsset._templateReplacements[templatePlaceholder]) {
            return '';
          } else {
            return templatePlaceholder;
          }
        })
        .replace(/\xad/g, '-'); // Include an actual hyphen when there's a soft hyphen:
      if (textContent) {
        textNodeValues.push(textContent);
      }
    } else if (node.nodeType === node.COMMENT_NODE) {
      if (/^\s*\[if\s+!IE\s*\]\s*>\s*$/i.test(node.nodeValue)) {
        // Start of non-IE conditional comment where the markup is in the containing document:
        conditionalCommentStack.push(true);
      } else if (/^\s*<!\[\s*endif\s*\]\s*$/.test(node.nodeValue)) {
        // End of non-IE conditional comment where the markup is in the containing document:
        conditionalCommentStack.pop();
      } else {
        // See if this is a conditional comment where the markup is in the comment value:
        htmlAsset.outgoingRelations.some(relation => {
          if (
            relation.type === 'HtmlConditionalComment' &&
            relation.node === node
          ) {
            conditionalCommentStack.push(true);
            const conditionalCommentDocument = relation.to.parseTree;
            let isWithinBody = false;
            for (
              let i = 0;
              i < conditionalCommentDocument.childNodes.length;
              i += 1
            ) {
              const childNode = conditionalCommentDocument.childNodes[i];
              // Don't proceed unless we're between
              // <!--ASSETGRAPH DOCUMENT START MARKER--> and <!--ASSETGRAPH DOCUMENT END MARKER-->
              if (childNode.nodeType === childNode.COMMENT_NODE) {
                if (
                  childNode.nodeValue === 'ASSETGRAPH DOCUMENT START MARKER'
                ) {
                  isWithinBody = true;
                  continue;
                } else if (
                  childNode.nodeValue === 'ASSETGRAPH DOCUMENT END MARKER'
                ) {
                  break;
                }
              } else if (!isWithinBody) {
                continue;
              }
              // Fake that the node in the conditional comment has the parent element of the comment as its parentElement
              // so that the correct CSS selectors match:
              Object.defineProperty(childNode, 'parentElement', {
                configurable: true,
                get() {
                  return node.parentElement;
                }
              });
              textNodeValues.push(
                ...traversePreOrder(childNode, [...idArray, i])
              );
              delete childNode.parentElement;
            }
            conditionalCommentStack.pop();
            // Short circuit
            return true;
          }
        });
      }
    } else if (
      node.nodeType === node.ELEMENT_NODE &&
      !excludedNodes.includes(node.tagName)
    ) {
      if (!idArray) {
        idArray = [0];
      }

      if (node.tagName === 'NOSCRIPT') {
        htmlAsset.outgoingRelations.some(relation => {
          if (relation.type === 'HtmlNoscript' && relation.node === node) {
            noscriptStack.push(true);
            const noscriptDocument = relation.to.parseTree;
            for (let i = 0; i < noscriptDocument.childNodes.length; i += 1) {
              const childNode = noscriptDocument.childNodes[i];
              // Fake that the top-level node in the inline asset has the <noscript> as its parentNode
              // so that the correct CSS selectors match:
              Object.defineProperty(childNode, 'parentElement', {
                configurable: true,
                get() {
                  return node;
                }
              });
              textNodeValues.push(
                ...traversePreOrder(childNode, [...idArray, i])
              );
              delete childNode.parentElement;
            }
            noscriptStack.pop();
            // Short circuit
            return true;
          }
        });
      } else if (
        node.tagName === 'INPUT' &&
        visualValueInputTypes.includes(node.type || 'text')
      ) {
        // Inputs might have visual text, but don't have childNodes
        const inputValue = (node.value || '').trim();
        const inputPlaceholder = (node.placeholder || '').trim();

        if (inputValue) {
          styledTexts.push(
            expandComputedStyle({
              text: [{ value: inputValue, predicates: {} }],
              ...getComputedStyle(node, idArray)
            })
          );
        }

        if (inputPlaceholder) {
          // Stupidly named var to avoid clash, fix after merging to master where const and let can be used
          const elementComputedStyle = getComputedStyle(node, idArray);
          styledTexts.push(
            expandComputedStyle({
              text: [{ value: inputPlaceholder, predicates: {} }],
              ...(getComputedStyle(
                node,
                idArray,
                'placeholder',
                elementComputedStyle
              ) || elementComputedStyle)
            })
          );
        }
      } else if (node.nodeType === node.ELEMENT_NODE) {
        if (node.constructor.name === 'HTMLBRElement') {
          textNodeValues.push(null);
        } else {
          const computedStyle = getComputedStyle(node, idArray);
          styledTexts.push(
            adjustPossibleCountersAndListItemNumbers(
              expandComputedStyle({
                text: [{ value: '', predicates: {} }],
                ...computedStyle
              }),
              conditionalCommentStack.length > 0 || noscriptStack.length > 0
            )
          );
          possibleNextListItemNumberStack.push([1]);

          const beforeStyledTexts = traceBeforeOrAfterPseudoElement(
            'before',
            node,
            idArray
          );
          const afterStyledTexts = traceBeforeOrAfterPseudoElement(
            'after',
            node,
            idArray
          );

          const childTextNodeValues = _.flatten(
            [].slice
              .call(node.childNodes)
              .map((childNode, i) =>
                traversePreOrder(childNode, [...idArray, i])
              )
          );
          const tracedTextNodes = [];
          if (childTextNodeValues.length > 0) {
            for (const hypotheticalValue of computedStyle['white-space']) {
              const normalizedText = normalizeTextNodeValues(
                childTextNodeValues,
                hypotheticalValue.value
              );
              if (normalizedText) {
                tracedTextNodes.push(
                  expandComputedStyle({
                    text: [
                      {
                        value: normalizedText,
                        predicates: hypotheticalValue.predicates
                      }
                    ],
                    ...computedStyle
                  })
                );
              }
            }
          }
          const groupedStyledTexts = _.compact([
            beforeStyledTexts,
            tracedTextNodes,
            afterStyledTexts
          ]);
          expandFirstLineAndFirstLetter(groupedStyledTexts, node, idArray);
          styledTexts.push(..._.flattenDeep(groupedStyledTexts));
          possibleNextListItemNumberStack.pop();
        }
      }
    }
    return textNodeValues;
  })(document.body.parentNode);

  // propsByText Before:
  // [
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': [ { value: 'a', predicates: {...} }, { value: 'b', predicates: {...} }],
  //       'font-style': [ { value: 'normal', predicates: {...} } ],
  //       'font-weight': [ { value: 400, predicates: {...} }, { value: 700, predicates: {...} }]
  //      }
  //   },
  //   ...
  // ]

  // Extract longhand property values from font shorthands
  for (const styledText of styledTexts) {
    for (const prop of ['font-family', 'font-weight', 'font-style']) {
      for (const [i, hypotheticalValue] of styledText[prop].entries()) {
        let value = hypotheticalValue.value;

        if (value) {
          if (hypotheticalValue.prop === 'font') {
            const fontProperties = cssFontParser(value);
            value =
              (fontProperties && fontProperties[prop]) ||
              initialValueByProp[prop];
          }
          if (prop === 'font-family' && Array.isArray(value)) {
            value = value.join(', ');
          }
          if (value !== hypotheticalValue.value) {
            styledText[prop].splice(i, 1, {
              predicates: hypotheticalValue.predicates,
              prop,
              value
            });
          }
        }
      }
    }
  }

  const seenPermutationByKey = {};
  const multipliedStyledTexts = _.flatten(
    styledTexts.map(styledText =>
      expandPermutations(styledText)
        .filter(function removeImpossibleCombinations(hypotheticalValueByProp) {
          return CSS_PROPS_TO_TRACE_AND_TEXT.every(prop =>
            Object.keys(hypotheticalValueByProp[prop].predicates).every(
              predicate => {
                const predicateValue =
                  hypotheticalValueByProp[prop].predicates[predicate];
                return (
                  predicateValue === false ||
                  CSS_PROPS_TO_TRACE_AND_TEXT.every(
                    otherProp =>
                      hypotheticalValueByProp[otherProp].predicates[
                        predicate
                      ] !== false
                  )
                );
              }
            )
          );
        })
        .map(hypotheticalValueByProp => {
          const props = {};
          for (const prop of CSS_PROPS_TO_TRACE_AND_TEXT) {
            props[prop] = hypotheticalValueByProp[prop].value;
          }
          // Apply text-transform:
          const textTransform = props['text-transform'];
          if (
            textTransform !== 'none' &&
            !hypotheticalValueByProp.text.isListIndicator
          ) {
            if (textTransform === 'uppercase') {
              props.text = props.text.toUpperCase();
            } else if (textTransform === 'lowercase') {
              props.text = props.text.toLowerCase();
            } else if (textTransform === 'capitalize') {
              props.text = capitalize.words(props.text);
            }
          }
          return props;
        })
        .filter(function filterAndDeduplicate(textWithProps) {
          if (!textWithProps.text) {
            return false;
          }
          // Unwrap the "hypothetical value" objects:
          let permutationKey = '';
          for (const prop of [
            'font-weight',
            'font-style',
            'font-family',
            'text'
          ]) {
            permutationKey += `${prop}\x1d${textWithProps[prop]}\x1d`;
          }

          // Deduplicate:
          if (!seenPermutationByKey[permutationKey]) {
            seenPermutationByKey[permutationKey] = true;
            return true;
          }
        })
        // Maybe this mapping step isn't necessary:
        .map(styledText => ({
          text: styledText.text,
          props: _.pick(styledText, FONT_PROPS)
        }))
    )
  );

  // multipliedStyledTexts After:
  // [
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': 'a',
  //       'font-style': 'normal',
  //       'font-weight': 400
  //     }
  //   },
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': 'b',
  //       'font-style': 'normal',
  //       'font-weight': 400
  //     }
  //   },
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': 'a',
  //       'font-style': 'normal',
  //       'font-weight': 700
  //     }
  //   },
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': 'b',
  //       'font-style': 'normal',
  //       'font-weight': 700
  //     }
  //   },
  //   ...
  // ]

  return multipliedStyledTexts;
}

module.exports = getTextByFontProperties;
