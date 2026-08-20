/**
 * Builds the Rokt-branded PDF user guide.
 *
 * Captures every screenshot from a live app running in MOCK mode against a
 * throwaway vault, so no customer credentials or role names ever reach the
 * document. Then renders docs/user-guide.html to PDF through the same Chrome.
 *
 *   npm run guide
 *
 * Requires the mock dev server on http://localhost:5173 (see package.json).
 */
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const DOCS_DIR = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(DOCS_DIR, 'images');
const APP = process.env.GUIDE_APP_URL ?? 'http://localhost:5174';
const PASSPHRASE = 'guide-demo-passphrase';
const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const VIEWPORT = { width: 1280, height: 860, deviceScaleFactor: 2 };

const DEMO_ENVIRONMENT = {
  label: 'Acme Retail',
  pod: 'us1',
  orgId: 4000155,
  accountId: 622,
  clientId: 'demo-client-id-not-a-real-credential',
  clientSecret: 'demo-secret-not-a-real-credential',
};

/** Wait for the app to settle before each capture. */
const settle = (ms = 450) => new Promise((r) => setTimeout(r, ms));

/**
 * Height of the actual rendered content, so screenshots don't carry a slab
 * of empty page below the interface. Modals cover the viewport, so those are
 * captured full-height instead.
 */
async function contentHeight(page) {
  return page.evaluate(() => {
    // Modals and the full-height unlock screen are captured as-is.
    if (document.querySelector('div[class*="fixed"]')) return null;
    const main = document.querySelector('main');
    // <main> is flex-stretched to the viewport, so measure its content instead.
    const content = main?.firstElementChild;
    if (!content) return null;
    return Math.ceil(content.getBoundingClientRect().bottom + 32);
  });
}

async function shoot(page, name, options = {}) {
  await settle(options.delay);
  const filePath = path.join(IMAGES_DIR, `${name}.png`);

  // Capturing a specific element (puppeteer scrolls it into view and clips to
  // it) — viewport clips always start at y:0, so scrolling alone can't frame
  // something further down the page.
  if (options.selector) {
    const element = await page.$(options.selector);
    if (!element) throw new Error(`No element matching ${options.selector}`);
    await element.screenshot({ path: filePath });
    console.log(`  captured ${name}.png (element ${options.selector})`);
    return;
  }

  const measured = options.fullViewport ? null : await contentHeight(page);
  const height = measured ? Math.min(measured, VIEWPORT.height) : VIEWPORT.height;
  await page.screenshot({
    path: filePath,
    clip: { x: 0, y: 0, width: VIEWPORT.width, height },
  });
  console.log(`  captured ${name}.png (${VIEWPORT.width}x${height})`);
}

const MODAL_SELECTOR = 'div.fixed';

/** Wait for the diff dialog itself, not just any positioned element. */
async function waitForModal(page) {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('h2')].some((h) =>
        h.textContent?.toLowerCase().includes('review changes'),
      ),
    { timeout: 15000 },
  );
}

/** Set a React-controlled input's value the way a keystroke would. */
async function fill(page, selector, value) {
  await page.waitForSelector(selector);
  await page.$eval(
    selector,
    (el, v) => {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    value,
  );
}

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, t) => [...document.querySelectorAll(sel)].find((el) => el.textContent?.includes(t)),
    selector,
    text,
  );
  const element = handle.asElement();
  if (!element) throw new Error(`No ${selector} containing "${text}"`);
  await element.click();
}

/**
 * Put the guide stack back to first-run state so the capture is repeatable:
 * lock the session (clearing the server's in-memory copy), then remove the
 * throwaway vault and its history.
 */
async function resetGuideVault() {
  try {
    await fetch(`${APP}/api/vault/lock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
  } catch {
    // Server may not be up yet; the file removal below is what matters.
  }
  const dataDir = path.resolve(DOCS_DIR, '..', process.env.GUIDE_DATA_DIR ?? '.guide-data');
  await rm(path.join(dataDir, 'vault.enc.json'), { force: true });
  await rm(path.join(dataDir, 'history'), { recursive: true, force: true });
}

async function main() {
  await resetGuideVault();
  await rm(IMAGES_DIR, { recursive: true, force: true });
  await mkdir(IMAGES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    defaultViewport: VIEWPORT,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none'],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  console.log('Capturing screenshots…');
  await page.goto(APP, { waitUntil: 'networkidle0' });

  // 1. First-run vault screen
  await shoot(page, '01-create-vault');

  await fill(page, 'input[autocomplete="new-password"]', PASSPHRASE);
  await page.$$eval(
    'input[type="password"]',
    (inputs, v) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      inputs.forEach((el) => {
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    },
    PASSPHRASE,
  );
  await clickByText(page, 'button', 'Create vault');
  await page.waitForSelector('header');

  // 2. Empty environments screen
  await page.goto(`${APP}/environments`, { waitUntil: 'networkidle0' });
  await shoot(page, '02-environments-empty');

  // 3. Add-environment form, filled in
  await clickByText(page, 'button', 'Add environment');
  await page.waitForSelector('form');
  const fields = await page.$$('form input');
  const values = [
    DEMO_ENVIRONMENT.label,
    String(DEMO_ENVIRONMENT.orgId),
    String(DEMO_ENVIRONMENT.accountId),
    DEMO_ENVIRONMENT.clientId,
    DEMO_ENVIRONMENT.clientSecret,
  ];
  for (const [index, handle] of fields.entries()) {
    if (values[index] === undefined) continue;
    await handle.evaluate((el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, values[index]);
  }
  await shoot(page, '03-environment-form');

  // 4. Pod dropdown open
  await clickByText(page, 'button[role="combobox"]', 'US1');
  await shoot(page, '04-pod-dropdown', { delay: 250 });
  await page.keyboard.press('Escape');

  await clickByText(page, 'button', 'Save environment');
  await page.waitForFunction(() => !document.querySelector('form'));

  // 5. Saved environment row with masked secret + test connection
  await clickByText(page, 'button', 'Test connection');
  await shoot(page, '05-environment-saved', { delay: 900 });

  // 6. Roles overview
  await page.goto(`${APP}/roles`, { waitUntil: 'networkidle0' });
  await shoot(page, '06-roles-overview', { delay: 700 });

  // 7. Role editor with a role selected
  await page.goto(`${APP}/roles/editor?role=ad-sales-manager`, { waitUntil: 'networkidle0' });
  await settle(800);
  await shoot(page, '07-role-editor');

  // 8. "What this role grants" expanded
  await page.evaluate(() => {
    const details = document.querySelector('details');
    if (details) details.open = true;
  });
  await shoot(page, '08-role-grants', { delay: 300 });
  await page.evaluate(() => {
    const details = document.querySelector('details');
    if (details) details.open = false;
  });

  // 9. Permission grid sections — captured as an element so the numbered
  //    section headings are actually in frame.
  await page.evaluate(() => {
    const sections = [...document.querySelectorAll('main section')];
    // Keep one section only — a taller figure would split across pages.
    sections.slice(1).forEach((s) => s.remove());
  });
  await shoot(page, '09-permission-sections', { delay: 400, selector: 'main > div' });
  await page.reload({ waitUntil: 'networkidle0' });
  await settle(700);

  // 10. Role dropdown open
  await page.evaluate(() => window.scrollTo(0, 0));
  await clickByText(page, 'button[role="combobox"]', 'Ad Sales Manager');
  await shoot(page, '10-role-dropdown', { delay: 300 });
  await page.keyboard.press('Escape');

  // 11. Diff preview for an edit
  await page.evaluate(() => {
    const box = [...document.querySelectorAll('input[type="checkbox"]')].find(
      (el) => el.getAttribute('aria-label')?.includes('Data Plans') && !el.checked,
    );
    box?.click();
  });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Review changes'),
    );
    button?.scrollIntoView({ block: 'center' });
    button?.click();
  });
  await waitForModal(page);
  await shoot(page, '11-diff-preview', { delay: 400, selector: MODAL_SELECTOR });

  // 12. Delete flow, with the acknowledgement gate
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.goto(`${APP}/roles/editor?role=agency-partner`, { waitUntil: 'networkidle0' });
  await settle(800);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Delete role'),
    );
    button?.scrollIntoView({ block: 'center' });
    button?.click();
  });
  await waitForModal(page);
  await shoot(page, '12-delete-confirm', { delay: 400, selector: MODAL_SELECTOR });

  // 13. History
  await page.goto(`${APP}/history`, { waitUntil: 'networkidle0' });
  await shoot(page, '13-history', { delay: 700 });

  // 14. Locked state
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Lock vault'),
    );
    button?.click();
  });
  await settle(900);
  await shoot(page, '14-unlock');

  console.log('Rendering PDF…');
  const guide = await browser.newPage();
  await guide.goto(`file://${path.join(DOCS_DIR, 'user-guide.html')}`, {
    waitUntil: 'networkidle0',
  });
  await guide.evaluateHandle('document.fonts.ready');
  await guide.pdf({
    path: path.join(DOCS_DIR, 'mParticle-Custom-Roles-Manager-User-Guide.pdf'),
    format: 'A4',
    printBackground: true,
    // Margins come from CSS @page, so the cover can run full bleed.
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="width:100%;font-family:Archivo,Helvetica,sans-serif;font-size:8px;color:#8a8a8a;padding:0 14mm;display:flex;justify-content:space-between;">
        <span>mParticle by Rokt — Custom Roles Manager</span>
        <span class="pageNumber"></span>
      </div>`,
  });

  await browser.close();
  console.log('Done: docs/mParticle-Custom-Roles-Manager-User-Guide.pdf');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
