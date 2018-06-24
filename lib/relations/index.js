for (const fileName of require('fs').readdirSync(__dirname)) {
  if (/\.js$/.test(fileName) && fileName !== 'index.js') {
    const type = fileName.replace(/\.js$/, '');
    Object.defineProperty(exports, 'type', {
      get() {
        const Constructor = require(`./${fileName}`);
        Constructor.prototype.type = type;
        return Constructor;
      }
    });
  }
}
