const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  const overlay = await page.$('vite-error-overlay');
  if (overlay) {
    const text = await page.evaluate(el => el.shadowRoot.innerHTML, overlay);
    console.log('VITE ERROR:', text);
  }
  await browser.close();
})();
