// Clicks the back button on every screen that has one and checks it stays inside the app.
// Run: npm run e2e   (starts its own vite server; set CHROMIUM_PATH to use a local browser)
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '') + '/';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) failed++; };

try {
  await page.goto(base);
  await page.waitForSelector('.welcome button, .bar');
  if (await page.$('.welcome button')) await page.click('.welcome button');
  await page.waitForSelector('.bar');

  const routes = ['/review', '/flash', '/flash?tag=food', '/flash?new=1', '/kana', '/kana?ref=all',
    '/numbers', '/prices', '/read', '/dialogue', '/commute'];
  for (const r of routes) {
    await page.goto(`${base}#${r}`);
    await page.waitForSelector('.bar');
    const back = await page.$('a.back');
    if (!back) { check(`${r} has back link`, false); continue; }
    const href = await back.getAttribute('href');
    await back.click();
    await page.waitForSelector('.bar');
    check(`${r} back -> ${href}`, href.startsWith('#/') && page.url().startsWith(base) && !(await page.content()).includes('404'), page.url());
  }

  // Reported bug: Review mid-session, back returns to Today.
  await page.goto(`${base}#/review`);
  await page.waitForSelector('.flash');
  await page.click('.flash');
  await page.click('.btn.g2');
  await page.click('a.back');
  await page.waitForSelector('.bar');
  check('review mid-session back -> Today', page.url() === `${base}#/`);
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
