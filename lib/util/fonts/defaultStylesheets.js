var fs = require('fs');

module.exports = [
    {
        predicates: { 'browser:firefox': false },
        text: fs.readFileSync(__dirname + '/chromium-default-stylesheet.css', 'utf-8')
    },
    {
        predicates: { 'browser:firefox': true },
        text: fs.readFileSync(__dirname + '/firefox-default-stylesheet.css', 'utf-8')
    }
];
