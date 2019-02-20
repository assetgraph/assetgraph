const puppeteer = require('puppeteer');
const urlTools = require('urltools');
const pathModule = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', async msg =>
    console.log(...(await Promise.all(msg.args().map(a => a.jsonValue()))))
  );
  const url = urlTools.fsFilePathToFileUrl(
    pathModule.resolve(__dirname, 'fonttracer.html')
  );
  await page.goto(url);
  await browser.close();
})();
