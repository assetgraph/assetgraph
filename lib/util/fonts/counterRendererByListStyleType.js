/* eslint-disable prefer-template */
const getCounterCharacters = require('./getCounterCharacters');

// Adapted from require('cldr').extractRbnfFunctionByType.renderGreekNumeralMinuscules.toString()
function renderGreekNumeralMinuscules(counterValue) {
  if (counterValue >= 1e18) {
    return String(counterValue);
  }
  if (counterValue >= 1e16) {
    return (
      renderGreekNumeralMinuscules(Math.floor(counterValue / 1e16)) +
      'μμμμ' +
      (counterValue === 1e16
        ? ''
        : ' ' + renderGreekNumeralMinuscules(counterValue % 1e16))
    );
  }
  if (counterValue >= 1e12) {
    return (
      renderGreekNumeralMinuscules(Math.floor(counterValue / 1e12)) +
      'μμμ' +
      (counterValue === 1e12
        ? ''
        : ' ' + renderGreekNumeralMinuscules(counterValue % 1e12))
    );
  }
  if (counterValue >= 1e8) {
    return (
      renderGreekNumeralMinuscules(Math.floor(counterValue / 1e8)) +
      'μμ' +
      (counterValue === 1e8
        ? ''
        : ' ' + renderGreekNumeralMinuscules(counterValue % 1e8))
    );
  }
  if (counterValue >= 1e4) {
    return (
      renderGreekNumeralMinuscules(Math.floor(counterValue / 1e4)) +
      'μ' +
      (counterValue === 1e4
        ? ''
        : ' ' + renderGreekNumeralMinuscules(counterValue % 1e4))
    );
  }
  if (counterValue >= 1e3) {
    return (
      '͵' +
      renderGreekNumeralMinuscules(Math.floor(counterValue / 1e3)) +
      (counterValue === 1e3
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 1e3))
    );
  }
  if (counterValue >= 900) {
    return (
      'ϡ' +
      (counterValue === 900
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 100))
    );
  }
  if (counterValue >= 800) {
    return (
      'ω' +
      (counterValue === 800
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 100))
    );
  }
  if (counterValue >= 700) {
    return (
      'ψ' +
      (counterValue === 700
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 100))
    );
  }
  if (counterValue >= 600) {
    return (
      'χ' +
      (counterValue === 600
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 100))
    );
  }
  if (counterValue >= 500) {
    return (
      'φ' +
      (counterValue === 500
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 100))
    );
  }
  if (counterValue >= 400) {
    return (
      'υ' +
      (counterValue === 400
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 100))
    );
  }
  if (counterValue >= 300) {
    return (
      'τ' +
      (counterValue === 300
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 100))
    );
  }
  if (counterValue >= 200) {
    return (
      'σ' +
      (counterValue === 200
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 100))
    );
  }
  if (counterValue >= 100) {
    return (
      'ρ' +
      (counterValue === 100
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 100))
    );
  }
  if (counterValue >= 90) {
    return (
      'ϟ' +
      (counterValue === 90
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 10))
    );
  }
  if (counterValue >= 80) {
    return (
      'π' +
      (counterValue === 80
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 10))
    );
  }
  if (counterValue >= 70) {
    return (
      'ο' +
      (counterValue === 70
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 10))
    );
  }
  if (counterValue >= 60) {
    return (
      'ξ' +
      (counterValue === 60
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 10))
    );
  }
  if (counterValue >= 50) {
    return (
      'ν' +
      (counterValue === 50
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 10))
    );
  }
  if (counterValue >= 40) {
    return (
      'μ' +
      (counterValue === 40
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 10))
    );
  }
  if (counterValue >= 30) {
    return (
      'λ' +
      (counterValue === 30
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 10))
    );
  }
  if (counterValue >= 20) {
    return (
      'κ' +
      (counterValue === 20
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 10))
    );
  }
  if (counterValue >= 10) {
    return (
      'ι' +
      (counterValue === 10
        ? ''
        : renderGreekNumeralMinuscules(counterValue % 10))
    );
  }
  if (counterValue >= 9) {
    return 'θ';
  }
  if (counterValue >= 8) {
    return 'η';
  }
  if (counterValue >= 7) {
    return 'ζ';
  }
  if (counterValue >= 6) {
    return 'ϝ';
  }
  if (counterValue >= 5) {
    return 'ε';
  }
  if (counterValue >= 4) {
    return 'δ';
  }
  if (counterValue >= 3) {
    return 'γ';
  }
  if (counterValue >= 2) {
    return 'β';
  }
  if (counterValue >= 1) {
    return 'α';
  }
  if (counterValue >= 0) {
    return '𐆊';
  }
}

// Adapted from require('cldr').extractRbnfFunctionByType.renderHebrewItem.toString()
function renderHebrewItem(counterValue) {
  if (counterValue < 0) {
    return '−' + renderHebrewItem(-counterValue);
  }
  if (counterValue >= 2100) {
    return String(counterValue);
  }
  if (counterValue >= 2e3) {
    return (
      'תתתתת' +
      (counterValue === 2e3 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1900) {
    return (
      'תתתתש' +
      (counterValue === 1900 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1800) {
    return (
      'תתתתר' +
      (counterValue === 1800 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1700) {
    return (
      'תתתתק' +
      (counterValue === 1700 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1600) {
    return (
      'תתתת' +
      (counterValue === 1600 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1500) {
    return (
      'תתתש' +
      (counterValue === 1500 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1400) {
    return (
      'תתתר' +
      (counterValue === 1400 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1300) {
    return (
      'תתתק' +
      (counterValue === 1300 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1200) {
    return (
      'תתת' +
      (counterValue === 1200 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1100) {
    return (
      'תתש' +
      (counterValue === 1100 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 1e3) {
    return (
      'תתר' + (counterValue === 1e3 ? '' : renderHebrewItem(counterValue % 1e3))
    );
  }
  if (counterValue >= 900) {
    return (
      'תתק' + (counterValue === 900 ? '' : renderHebrewItem(counterValue % 100))
    );
  }
  if (counterValue >= 800) {
    return (
      'תת' + (counterValue === 800 ? '' : renderHebrewItem(counterValue % 100))
    );
  }
  if (counterValue >= 745) {
    return 'תש' + renderHebrewItem(counterValue % 100);
  }
  if (counterValue >= 744) {
    return 'תשדמ';
  }
  if (counterValue >= 700) {
    return (
      'תש' + (counterValue === 700 ? '' : renderHebrewItem(counterValue % 100))
    );
  }
  if (counterValue >= 699) {
    return 'תר' + renderHebrewItem(counterValue % 100);
  }
  if (counterValue >= 698) {
    return 'תרחצ';
  }
  if (counterValue >= 600) {
    return (
      'תר' + (counterValue === 600 ? '' : renderHebrewItem(counterValue % 100))
    );
  }
  if (counterValue >= 500) {
    return (
      'תק' + (counterValue === 500 ? '' : renderHebrewItem(counterValue % 100))
    );
  }
  if (counterValue >= 400) {
    return (
      'ת' + (counterValue === 400 ? '' : renderHebrewItem(counterValue % 100))
    );
  }
  if (counterValue >= 345) {
    return 'ש' + renderHebrewItem(counterValue % 100);
  }
  if (counterValue >= 344) {
    return 'שדמ';
  }
  if (counterValue >= 305) {
    return 'ש' + renderHebrewItem(counterValue % 100);
  }
  if (counterValue >= 304) {
    return 'דש';
  }
  if (counterValue >= 300) {
    return (
      'ש' + (counterValue === 300 ? '' : renderHebrewItem(counterValue % 100))
    );
  }
  if (counterValue >= 299) {
    return 'ר' + renderHebrewItem(counterValue % 100);
  }
  if (counterValue >= 298) {
    return 'רחצ';
  }
  if (counterValue >= 200) {
    return (
      'ר' + (counterValue === 200 ? '' : renderHebrewItem(counterValue % 100))
    );
  }
  if (counterValue >= 100) {
    return (
      'ק' + (counterValue === 100 ? '' : renderHebrewItem(counterValue % 100))
    );
  }
  if (counterValue >= 90) {
    return (
      'צ' + (counterValue === 90 ? '' : renderHebrewItem(counterValue % 10))
    );
  }
  if (counterValue >= 80) {
    return (
      'פ' + (counterValue === 80 ? '' : renderHebrewItem(counterValue % 10))
    );
  }
  if (counterValue >= 70) {
    return (
      'ע' + (counterValue === 70 ? '' : renderHebrewItem(counterValue % 10))
    );
  }
  if (counterValue >= 60) {
    return (
      'ס' + (counterValue === 60 ? '' : renderHebrewItem(counterValue % 10))
    );
  }
  if (counterValue >= 50) {
    return (
      'נ' + (counterValue === 50 ? '' : renderHebrewItem(counterValue % 10))
    );
  }
  if (counterValue >= 40) {
    return (
      'מ' + (counterValue === 40 ? '' : renderHebrewItem(counterValue % 10))
    );
  }
  if (counterValue >= 30) {
    return (
      'ל' + (counterValue === 30 ? '' : renderHebrewItem(counterValue % 10))
    );
  }
  if (counterValue >= 20) {
    return (
      'כ' + (counterValue === 20 ? '' : renderHebrewItem(counterValue % 10))
    );
  }
  if (counterValue >= 17) {
    return 'י' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 16) {
    return 'טז';
  }
  if (counterValue >= 15) {
    return 'טו';
  }
  if (counterValue >= 10) {
    return (
      'י' + (counterValue === 10 ? '' : renderHebrewItem(counterValue % 10))
    );
  }
  if (counterValue >= 9) {
    return 'ט';
  }
  if (counterValue >= 8) {
    return 'ח';
  }
  if (counterValue >= 7) {
    return 'ז';
  }
  if (counterValue >= 6) {
    return 'ו';
  }
  if (counterValue >= 5) {
    return 'ה';
  }
  if (counterValue >= 4) {
    return 'ד';
  }
  if (counterValue >= 3) {
    return 'ג';
  }
  if (counterValue >= 2) {
    return 'ב';
  }
  if (counterValue >= 1) {
    return 'א';
  }
  if (counterValue >= 0) {
    return '״';
  }
}

// Adapted from require('cldr').extractRbnfFunctionByType.renderHebrew099.toString()
function renderHebrew099(counterValue) {
  if (counterValue >= 91) {
    return 'צ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 90) {
    return '״צ';
  }
  if (counterValue >= 81) {
    return 'פ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 80) {
    return '״פ';
  }
  if (counterValue >= 71) {
    return 'ע״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 70) {
    return '״ע';
  }
  if (counterValue >= 61) {
    return 'ס״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 60) {
    return '״ס';
  }
  if (counterValue >= 51) {
    return 'נ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 50) {
    return '״נ';
  }
  if (counterValue >= 41) {
    return 'מ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 40) {
    return '״מ';
  }
  if (counterValue >= 31) {
    return 'ל״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 30) {
    return '״ל';
  }
  if (counterValue >= 21) {
    return 'כ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 20) {
    return '״כ';
  }
  if (counterValue >= 17) {
    return 'י״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 16) {
    return 'ט״ז';
  }
  if (counterValue >= 15) {
    return 'ט״ו';
  }
  if (counterValue >= 11) {
    return 'י״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 1) {
    return '״' + renderHebrewItem(counterValue);
  }
  if (counterValue >= 0) {
    return '׳';
  }
}

// Adapted from require('cldr').extractRbnfFunctionByType.renderHebrew.toString()
function renderHebrew(counterValue) {
  if (counterValue < 0) {
    return '−' + renderHebrew(-counterValue);
  }
  if (counterValue >= 1000001) {
    return String(counterValue);
  }
  if (counterValue >= 1e6) {
    return 'אלף אלפים';
  }
  if (counterValue >= 3001) {
    return (
      renderHebrewThousands(Math.floor(counterValue / 1e3)) +
      (counterValue === 3001 ? '' : renderHebrew(counterValue % 1e3))
    );
  }
  if (counterValue >= 3e3) {
    return renderHebrew(Math.floor(counterValue / 1e3)) + ' אלפים';
  }
  if (counterValue >= 2001) {
    return (
      renderHebrewThousands(Math.floor(counterValue / 1e3)) +
      (counterValue === 2001 ? '' : renderHebrew(counterValue % 1e3))
    );
  }
  if (counterValue >= 2e3) {
    return 'אלפיים';
  }
  if (counterValue >= 1001) {
    return (
      renderHebrewThousands(Math.floor(counterValue / 1e3)) +
      (counterValue === 1001 ? '' : renderHebrew(counterValue % 1e3))
    );
  }
  if (counterValue >= 1e3) {
    return 'אלף';
  }
  if (counterValue >= 901) {
    return 'תתק' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 900) {
    return 'תת״ק';
  }
  if (counterValue >= 801) {
    return 'תת' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 800) {
    return 'ת״ת';
  }
  if (counterValue >= 745) {
    return 'תש' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 744) {
    return 'תשד״מ';
  }
  if (counterValue >= 701) {
    return 'תש' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 700) {
    return 'ת״ש';
  }
  if (counterValue >= 699) {
    return 'תר' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 698) {
    return 'תרח״צ';
  }
  if (counterValue >= 601) {
    return 'תר' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 600) {
    return 'ת״ר';
  }
  if (counterValue >= 501) {
    return 'תק' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 500) {
    return 'ת״ק';
  }
  if (counterValue >= 400) {
    return 'ת' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 345) {
    return 'ש' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 344) {
    return 'שד״מ';
  }
  if (counterValue >= 305) {
    return 'ש' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 304) {
    return 'ד״ש';
  }
  if (counterValue >= 300) {
    return 'ש' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 299) {
    return 'ר' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 298) {
    return 'רח״צ';
  }
  if (counterValue >= 200) {
    return 'ר' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 100) {
    return 'ק' + renderHebrew099(counterValue % 100);
  }
  if (counterValue >= 91) {
    return 'צ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 90) {
    return 'צ׳';
  }
  if (counterValue >= 81) {
    return 'פ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 80) {
    return 'פ׳';
  }
  if (counterValue >= 71) {
    return 'ע״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 70) {
    return 'ע׳';
  }
  if (counterValue >= 61) {
    return 'ס״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 60) {
    return 'ס׳';
  }
  if (counterValue >= 51) {
    return 'נ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 50) {
    return 'נ׳';
  }
  if (counterValue >= 41) {
    return 'מ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 40) {
    return 'מ׳';
  }
  if (counterValue >= 31) {
    return 'ל״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 30) {
    return 'ל׳';
  }
  if (counterValue >= 21) {
    return 'כ״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 20) {
    return 'כ׳';
  }
  if (counterValue >= 17) {
    return 'י״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 16) {
    return 'ט״ז';
  }
  if (counterValue >= 15) {
    return 'ט״ו';
  }
  if (counterValue >= 11) {
    return 'י״' + renderHebrewItem(counterValue % 10);
  }
  if (counterValue >= 0) {
    return renderHebrewItem(counterValue) + '׳';
  }
}

// Adapted from require('cldr').extractRbnfFunctionByType.renderHebrewThousands.toString()
function renderHebrewThousands(counterValue) {
  if (counterValue >= 401) {
    return renderHebrew(counterValue) + '׳';
  }
  if (counterValue >= 100) {
    return renderHebrew(counterValue) + (counterValue === 100 ? '' : '׳');
  }
  if (counterValue >= 10) {
    return renderHebrew(counterValue) + (counterValue === 10 ? '' : '׳');
  }
  if (counterValue >= 0) {
    return renderHebrew(counterValue);
  }
}

exports.none = () => '';

exports.disc = () => '•';

exports.circle = () => ''; // Doesn't seem to be a glyph

exports.square = () => ''; // Doesn't seem to be a glyph

exports.decimal = String;

// FIXME: Depends on the number of digits in the max (possible) overall counter value
exports['decimal-leading-zero'] = counterValue => '0' + counterValue;

// Adapted from require('cldr').extractRbnfFunctionByType.renderRomanLower.toString()
exports['lower-roman'] = counterValue => {
  if (counterValue < 0) {
    return '−' + this['lower-roman'](-counterValue);
  }
  if (counterValue >= 5e3) {
    return String(counterValue);
  }
  if (counterValue >= 4e3) {
    return (
      'mmmm' +
      (counterValue === 4e3 ? '' : this['lower-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 3e3) {
    return (
      'mmm' +
      (counterValue === 3e3 ? '' : this['lower-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 2e3) {
    return (
      'mm' +
      (counterValue === 2e3 ? '' : this['lower-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 1e3) {
    return (
      'm' +
      (counterValue === 1e3 ? '' : this['lower-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 900) {
    return (
      'cm' +
      (counterValue === 900 ? '' : this['lower-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 800) {
    return (
      'dccc' +
      (counterValue === 800 ? '' : this['lower-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 700) {
    return (
      'dcc' +
      (counterValue === 700 ? '' : this['lower-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 600) {
    return (
      'dc' +
      (counterValue === 600 ? '' : this['lower-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 500) {
    return (
      'd' +
      (counterValue === 500 ? '' : this['lower-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 400) {
    return (
      'cd' +
      (counterValue === 400 ? '' : this['lower-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 300) {
    return (
      'ccc' +
      (counterValue === 300 ? '' : this['lower-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 200) {
    return (
      'cc' +
      (counterValue === 200 ? '' : this['lower-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 100) {
    return (
      'c' +
      (counterValue === 100 ? '' : this['lower-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 90) {
    return (
      'xc' + (counterValue === 90 ? '' : this['lower-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 80) {
    return (
      'lxxx' +
      (counterValue === 80 ? '' : this['lower-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 70) {
    return (
      'lxx' +
      (counterValue === 70 ? '' : this['lower-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 60) {
    return (
      'lx' + (counterValue === 60 ? '' : this['lower-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 50) {
    return (
      'l' + (counterValue === 50 ? '' : this['lower-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 40) {
    return (
      'xl' + (counterValue === 40 ? '' : this['lower-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 30) {
    return (
      'xxx' +
      (counterValue === 30 ? '' : this['lower-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 20) {
    return (
      'xx' + (counterValue === 20 ? '' : this['lower-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 10) {
    return (
      'x' + (counterValue === 10 ? '' : this['lower-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 9) {
    return 'ix';
  }
  if (counterValue >= 8) {
    return 'viii';
  }
  if (counterValue >= 7) {
    return 'vii';
  }
  if (counterValue >= 6) {
    return 'vi';
  }
  if (counterValue >= 5) {
    return 'v';
  }
  if (counterValue >= 4) {
    return 'iv';
  }
  if (counterValue >= 3) {
    return 'iii';
  }
  if (counterValue >= 2) {
    return 'ii';
  }
  if (counterValue >= 1) {
    return 'i';
  }
  if (counterValue >= 0) {
    return String(counterValue);
  }
};

// Adapted from require('cldr').extractRbnfFunctionByType.renderRomanUpper.toString()
exports['upper-roman'] = counterValue => {
  if (counterValue < 0) {
    return '−' + this['upper-roman'](-counterValue);
  }
  if (counterValue >= 4e5) {
    return String(counterValue);
  }
  if (counterValue >= 3e5) {
    return (
      'ↈↈↈ' +
      (counterValue === 3e5 ? '' : this['upper-roman'](counterValue % 1e5))
    );
  }
  if (counterValue >= 2e5) {
    return (
      'ↈↈ' +
      (counterValue === 2e5 ? '' : this['upper-roman'](counterValue % 1e5))
    );
  }
  if (counterValue >= 1e5) {
    return (
      'ↈ' +
      (counterValue === 1e5 ? '' : this['upper-roman'](counterValue % 1e5))
    );
  }
  if (counterValue >= 9e4) {
    return (
      'ↂↈ' +
      (counterValue === 9e4 ? '' : this['upper-roman'](counterValue % 1e4))
    );
  }
  if (counterValue >= 8e4) {
    return (
      'ↇↂↂↂ' +
      (counterValue === 8e4 ? '' : this['upper-roman'](counterValue % 1e4))
    );
  }
  if (counterValue >= 7e4) {
    return (
      'ↇↂↂ' +
      (counterValue === 7e4 ? '' : this['upper-roman'](counterValue % 1e4))
    );
  }
  if (counterValue >= 6e4) {
    return (
      'ↇↂ' +
      (counterValue === 6e4 ? '' : this['upper-roman'](counterValue % 1e4))
    );
  }
  if (counterValue >= 5e4) {
    return (
      'ↇ' +
      (counterValue === 5e4 ? '' : this['upper-roman'](counterValue % 1e4))
    );
  }
  if (counterValue >= 4e4) {
    return (
      'ↂↇ' +
      (counterValue === 4e4 ? '' : this['upper-roman'](counterValue % 1e4))
    );
  }
  if (counterValue >= 3e4) {
    return (
      'ↂↂↂ' +
      (counterValue === 3e4 ? '' : this['upper-roman'](counterValue % 1e4))
    );
  }
  if (counterValue >= 2e4) {
    return (
      'ↂↂ' +
      (counterValue === 2e4 ? '' : this['upper-roman'](counterValue % 1e4))
    );
  }
  if (counterValue >= 1e4) {
    return (
      'ↂ' +
      (counterValue === 1e4 ? '' : this['upper-roman'](counterValue % 1e4))
    );
  }
  if (counterValue >= 9e3) {
    return (
      'Mↂ' +
      (counterValue === 9e3 ? '' : this['upper-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 8e3) {
    return (
      'ↁMMM' +
      (counterValue === 8e3 ? '' : this['upper-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 7e3) {
    return (
      'ↁMM' +
      (counterValue === 7e3 ? '' : this['upper-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 6e3) {
    return (
      'ↁM' +
      (counterValue === 6e3 ? '' : this['upper-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 5e3) {
    return (
      'ↁ' +
      (counterValue === 5e3 ? '' : this['upper-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 4e3) {
    return (
      'Mↁ' +
      (counterValue === 4e3 ? '' : this['upper-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 3e3) {
    return (
      'MMM' +
      (counterValue === 3e3 ? '' : this['upper-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 2e3) {
    return (
      'MM' +
      (counterValue === 2e3 ? '' : this['upper-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 1e3) {
    return (
      'M' +
      (counterValue === 1e3 ? '' : this['upper-roman'](counterValue % 1e3))
    );
  }
  if (counterValue >= 900) {
    return (
      'CM' +
      (counterValue === 900 ? '' : this['upper-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 800) {
    return (
      'DCCC' +
      (counterValue === 800 ? '' : this['upper-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 700) {
    return (
      'DCC' +
      (counterValue === 700 ? '' : this['upper-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 600) {
    return (
      'DC' +
      (counterValue === 600 ? '' : this['upper-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 500) {
    return (
      'D' +
      (counterValue === 500 ? '' : this['upper-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 400) {
    return (
      'CD' +
      (counterValue === 400 ? '' : this['upper-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 300) {
    return (
      'CCC' +
      (counterValue === 300 ? '' : this['upper-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 200) {
    return (
      'CC' +
      (counterValue === 200 ? '' : this['upper-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 100) {
    return (
      'C' +
      (counterValue === 100 ? '' : this['upper-roman'](counterValue % 100))
    );
  }
  if (counterValue >= 90) {
    return (
      'XC' + (counterValue === 90 ? '' : this['upper-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 80) {
    return (
      'LXXX' +
      (counterValue === 80 ? '' : this['upper-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 70) {
    return (
      'LXX' +
      (counterValue === 70 ? '' : this['upper-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 60) {
    return (
      'LX' + (counterValue === 60 ? '' : this['upper-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 50) {
    return (
      'L' + (counterValue === 50 ? '' : this['upper-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 40) {
    return (
      'XL' + (counterValue === 40 ? '' : this['upper-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 30) {
    return (
      'XXX' +
      (counterValue === 30 ? '' : this['upper-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 20) {
    return (
      'XX' + (counterValue === 20 ? '' : this['upper-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 10) {
    return (
      'X' + (counterValue === 10 ? '' : this['upper-roman'](counterValue % 10))
    );
  }
  if (counterValue >= 9) {
    return 'IX';
  }
  if (counterValue >= 8) {
    return 'VIII';
  }
  if (counterValue >= 7) {
    return 'VII';
  }
  if (counterValue >= 6) {
    return 'VI';
  }
  if (counterValue >= 5) {
    return 'V';
  }
  if (counterValue >= 4) {
    return 'IV';
  }
  if (counterValue >= 3) {
    return 'III';
  }
  if (counterValue >= 2) {
    return 'II';
  }
  if (counterValue >= 1) {
    return 'I';
  }
  if (counterValue >= 0) {
    return 'N';
  }
};

// Adapted from require('cldr').extractRbnfFunctionByType.renderGreekLower.toString()
exports['lower-greek'] = counterValue => {
  if (counterValue < 0) {
    return '−' + this['lower-greek'](-counterValue);
  }
  if (counterValue >= 0) {
    return renderGreekNumeralMinuscules(counterValue) + '´';
  }
};

exports['lower-latin'] = counterValue =>
  getCounterCharacters(
    {
      props: {
        system: 'alphabetic',
        symbols: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'
      }
    },
    [],
    counterValue
  );

exports['lower-alpha'] = counterValue =>
  getCounterCharacters(
    {
      props: {
        system: 'alphabetic',
        symbols: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'
      }
    },
    [],
    counterValue
  );

exports['upper-latin'] = counterValue =>
  getCounterCharacters(
    {
      props: {
        system: 'alphabetic',
        symbols: 'A B C D E F G H I J K L M N O P Q R S T U V W Z Y Z'
      }
    },
    [],
    counterValue
  );

exports['upper-alpha'] = counterValue =>
  getCounterCharacters(
    {
      props: {
        system: 'alphabetic',
        symbols: 'A B C D E F G H I J K L M N O P Q R S T U V W Z Y Z'
      }
    },
    [],
    counterValue
  );

// Adapted from require('cldr').extractRbnfFunctionByType.renderArmenianLower.toString()
exports.armenian = counterValue => {
  if (counterValue < 0) {
    return '−' + this.armenian(-counterValue);
  }
  if (counterValue >= 1e4) {
    return String(counterValue);
  }
  if (counterValue >= 9e3) {
    return (
      'ք' + (counterValue === 9e3 ? '' : this.armenian(counterValue % 1e3))
    );
  }
  if (counterValue >= 8e3) {
    return (
      'փ' + (counterValue === 8e3 ? '' : this.armenian(counterValue % 1e3))
    );
  }
  if (counterValue >= 7e3) {
    return (
      'ւ' + (counterValue === 7e3 ? '' : this.armenian(counterValue % 1e3))
    );
  }
  if (counterValue >= 6e3) {
    return (
      'ց' + (counterValue === 6e3 ? '' : this.armenian(counterValue % 1e3))
    );
  }
  if (counterValue >= 5e3) {
    return (
      'ր' + (counterValue === 5e3 ? '' : this.armenian(counterValue % 1e3))
    );
  }
  if (counterValue >= 4e3) {
    return (
      'տ' + (counterValue === 4e3 ? '' : this.armenian(counterValue % 1e3))
    );
  }
  if (counterValue >= 3e3) {
    return (
      'վ' + (counterValue === 3e3 ? '' : this.armenian(counterValue % 1e3))
    );
  }
  if (counterValue >= 2e3) {
    return (
      'ս' + (counterValue === 2e3 ? '' : this.armenian(counterValue % 1e3))
    );
  }
  if (counterValue >= 1e3) {
    return (
      'ռ' + (counterValue === 1e3 ? '' : this.armenian(counterValue % 1e3))
    );
  }
  if (counterValue >= 900) {
    return (
      'ջ' + (counterValue === 900 ? '' : this.armenian(counterValue % 100))
    );
  }
  if (counterValue >= 800) {
    return (
      'պ' + (counterValue === 800 ? '' : this.armenian(counterValue % 100))
    );
  }
  if (counterValue >= 700) {
    return (
      'չ' + (counterValue === 700 ? '' : this.armenian(counterValue % 100))
    );
  }
  if (counterValue >= 600) {
    return (
      'ո' + (counterValue === 600 ? '' : this.armenian(counterValue % 100))
    );
  }
  if (counterValue >= 500) {
    return (
      'շ' + (counterValue === 500 ? '' : this.armenian(counterValue % 100))
    );
  }
  if (counterValue >= 400) {
    return (
      'ն' + (counterValue === 400 ? '' : this.armenian(counterValue % 100))
    );
  }
  if (counterValue >= 300) {
    return (
      'յ' + (counterValue === 300 ? '' : this.armenian(counterValue % 100))
    );
  }
  if (counterValue >= 200) {
    return (
      'մ' + (counterValue === 200 ? '' : this.armenian(counterValue % 100))
    );
  }
  if (counterValue >= 100) {
    return (
      'ճ' + (counterValue === 100 ? '' : this.armenian(counterValue % 100))
    );
  }
  if (counterValue >= 90) {
    return 'ղ' + (counterValue === 90 ? '' : this.armenian(counterValue % 10));
  }
  if (counterValue >= 80) {
    return 'ձ' + (counterValue === 80 ? '' : this.armenian(counterValue % 10));
  }
  if (counterValue >= 70) {
    return 'հ' + (counterValue === 70 ? '' : this.armenian(counterValue % 10));
  }
  if (counterValue >= 60) {
    return 'կ' + (counterValue === 60 ? '' : this.armenian(counterValue % 10));
  }
  if (counterValue >= 50) {
    return 'ծ' + (counterValue === 50 ? '' : this.armenian(counterValue % 10));
  }
  if (counterValue >= 40) {
    return 'խ' + (counterValue === 40 ? '' : this.armenian(counterValue % 10));
  }
  if (counterValue >= 30) {
    return 'լ' + (counterValue === 30 ? '' : this.armenian(counterValue % 10));
  }
  if (counterValue >= 20) {
    return 'ի' + (counterValue === 20 ? '' : this.armenian(counterValue % 10));
  }
  if (counterValue >= 10) {
    return 'ժ' + (counterValue === 10 ? '' : this.armenian(counterValue % 10));
  }
  if (counterValue >= 9) {
    return 'թ';
  }
  if (counterValue >= 8) {
    return 'ը';
  }
  if (counterValue >= 7) {
    return 'է';
  }
  if (counterValue >= 6) {
    return 'զ';
  }
  if (counterValue >= 5) {
    return 'ե';
  }
  if (counterValue >= 4) {
    return 'դ';
  }
  if (counterValue >= 3) {
    return 'գ';
  }
  if (counterValue >= 2) {
    return 'բ';
  }
  if (counterValue >= 1) {
    return 'ա';
  }
  if (counterValue >= 0) {
    return '0';
  }
};

// Adapted from require('cldr').extractRbnfFunctionByType.renderGeorgian.toString()
exports.georgian = counterValue => {
  if (counterValue < 0) {
    return '−' + this.georgian(-counterValue);
  }
  if (counterValue >= 2e4) {
    return String(counterValue);
  }
  if (counterValue >= 1e4) {
    return (
      'ჯ' + (counterValue === 1e4 ? '' : this.georgian(counterValue % 1e4))
    );
  }
  if (counterValue >= 9e3) {
    return (
      'ჵ' + (counterValue === 9e3 ? '' : this.georgian(counterValue % 1e3))
    );
  }
  if (counterValue >= 8e3) {
    return (
      'ჴ' + (counterValue === 8e3 ? '' : this.georgian(counterValue % 1e3))
    );
  }
  if (counterValue >= 7e3) {
    return (
      'ხ' + (counterValue === 7e3 ? '' : this.georgian(counterValue % 1e3))
    );
  }
  if (counterValue >= 6e3) {
    return (
      'ჭ' + (counterValue === 6e3 ? '' : this.georgian(counterValue % 1e3))
    );
  }
  if (counterValue >= 5e3) {
    return (
      'წ' + (counterValue === 5e3 ? '' : this.georgian(counterValue % 1e3))
    );
  }
  if (counterValue >= 4e3) {
    return (
      'ძ' + (counterValue === 4e3 ? '' : this.georgian(counterValue % 1e3))
    );
  }
  if (counterValue >= 3e3) {
    return (
      'ც' + (counterValue === 3e3 ? '' : this.georgian(counterValue % 1e3))
    );
  }
  if (counterValue >= 2e3) {
    return (
      'ჩ' + (counterValue === 2e3 ? '' : this.georgian(counterValue % 1e3))
    );
  }
  if (counterValue >= 1e3) {
    return (
      'შ' + (counterValue === 1e3 ? '' : this.georgian(counterValue % 1e3))
    );
  }
  if (counterValue >= 900) {
    return (
      'ყ' + (counterValue === 900 ? '' : this.georgian(counterValue % 100))
    );
  }
  if (counterValue >= 800) {
    return (
      'ღ' + (counterValue === 800 ? '' : this.georgian(counterValue % 100))
    );
  }
  if (counterValue >= 700) {
    return (
      'ქ' + (counterValue === 700 ? '' : this.georgian(counterValue % 100))
    );
  }
  if (counterValue >= 600) {
    return (
      'ფ' + (counterValue === 600 ? '' : this.georgian(counterValue % 100))
    );
  }
  if (counterValue >= 500) {
    return (
      'ჳ' + (counterValue === 500 ? '' : this.georgian(counterValue % 100))
    );
  }
  if (counterValue >= 400) {
    return (
      'უ' + (counterValue === 400 ? '' : this.georgian(counterValue % 100))
    );
  }
  if (counterValue >= 300) {
    return (
      'ტ' + (counterValue === 300 ? '' : this.georgian(counterValue % 100))
    );
  }
  if (counterValue >= 200) {
    return (
      'ს' + (counterValue === 200 ? '' : this.georgian(counterValue % 100))
    );
  }
  if (counterValue >= 100) {
    return (
      'რ' + (counterValue === 100 ? '' : this.georgian(counterValue % 100))
    );
  }
  if (counterValue >= 90) {
    return 'ჟ' + (counterValue === 90 ? '' : this.georgian(counterValue % 10));
  }
  if (counterValue >= 80) {
    return 'პ' + (counterValue === 80 ? '' : this.georgian(counterValue % 10));
  }
  if (counterValue >= 70) {
    return 'ო' + (counterValue === 70 ? '' : this.georgian(counterValue % 10));
  }
  if (counterValue >= 60) {
    return 'ჲ' + (counterValue === 60 ? '' : this.georgian(counterValue % 10));
  }
  if (counterValue >= 50) {
    return 'ნ' + (counterValue === 50 ? '' : this.georgian(counterValue % 10));
  }
  if (counterValue >= 40) {
    return 'მ' + (counterValue === 40 ? '' : this.georgian(counterValue % 10));
  }
  if (counterValue >= 30) {
    return 'ლ' + (counterValue === 30 ? '' : this.georgian(counterValue % 10));
  }
  if (counterValue >= 20) {
    return 'კ' + (counterValue === 20 ? '' : this.georgian(counterValue % 10));
  }
  if (counterValue >= 10) {
    return 'ი' + (counterValue === 10 ? '' : this.georgian(counterValue % 10));
  }
  if (counterValue >= 9) {
    return 'თ';
  }
  if (counterValue >= 8) {
    return 'ჱ';
  }
  if (counterValue >= 7) {
    return 'ზ';
  }
  if (counterValue >= 6) {
    return 'ვ';
  }
  if (counterValue >= 5) {
    return 'ე';
  }
  if (counterValue >= 4) {
    return 'დ';
  }
  if (counterValue >= 3) {
    return 'გ';
  }
  if (counterValue >= 2) {
    return 'ბ';
  }
  if (counterValue >= 1) {
    return 'ა';
  }
  if (counterValue >= 0) {
    String(counterValue);
  }
};

exports.hebrew = renderHebrew;
