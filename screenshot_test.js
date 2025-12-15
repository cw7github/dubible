import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 900, height: 1200 }
  });

  const page = await browser.newPage();

  try {
    const testFilePath = 'file://' + join(__dirname, 'test_fix.html');
    console.log('Opening test file:', testFilePath);

    await page.goto(testFilePath, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.screenshot({ path: 'fix_comparison.png', fullPage: true });
    console.log('Screenshot saved: fix_comparison.png');

    console.log('Waiting 5 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
