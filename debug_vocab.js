import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 375, height: 812 },
    args: ['--window-size=375,812']
  });

  const page = await browser.newPage();

  try {
    console.log('Navigating to localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Inject test words into localStorage
    console.log('Injecting test words...');
    await page.evaluate(() => {
      const testWords = [
        {
          id: '1',
          chinese: '耶',
          pinyin: 'yē',
          definition: 'exclamation of surprise; used in transcription',
          sourceVerse: { bookId: 1, chapter: 1, verse: 1 },
          createdAt: new Date().toISOString(),
          srsData: { status: 'learning', level: 0, nextReview: new Date().toISOString() }
        },
        {
          id: '2',
          chinese: '家',
          pinyin: 'jiā',
          definition: 'home, family, house',
          sourceVerse: { bookId: 1, chapter: 1, verse: 2 },
          createdAt: new Date().toISOString(),
          srsData: { status: 'learning', level: 0, nextReview: new Date().toISOString() }
        },
        {
          id: '3',
          chinese: '神',
          pinyin: 'shén',
          definition: 'God, spirit, divine',
          sourceVerse: { bookId: 1, chapter: 1, verse: 3 },
          createdAt: new Date().toISOString(),
          srsData: { status: 'mastered', level: 5, nextReview: new Date().toISOString() }
        }
      ];

      const existingStore = JSON.parse(localStorage.getItem('vocabulary-store') || '{}');
      existingStore.state = existingStore.state || {};
      existingStore.state.words = testWords;
      localStorage.setItem('vocabulary-store', JSON.stringify(existingStore));
    });

    console.log('Reloading page...');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click the Words button at the bottom
    console.log('Opening vocabulary screen...');
    const vocabOpened = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Look for "Words" button
      const wordsBtn = buttons.find(btn =>
        btn.textContent.includes('Words') ||
        btn.querySelector('svg') // Look for button with icon
      );
      if (wordsBtn) {
        wordsBtn.click();
        return true;
      }
      return false;
    });

    if (!vocabOpened) {
      // Try clicking by position (bottom right area)
      await page.click('button:has-text("Words")').catch(() => {
        console.log('Could not find Words button by text');
      });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot of vocabulary screen
    await page.screenshot({ path: 'vocab_full.png', fullPage: true });
    console.log('Screenshot: vocab_full.png saved');

    // Get word list container
    const wordListExists = await page.evaluate(() => {
      return document.querySelector('.space-y-px') !== null;
    });

    console.log('Word list exists:', wordListExists);

    // Screenshot the word items specifically
    const wordItems = await page.$$('div.space-y-px > div');
    console.log('Found word items:', wordItems.length);

    if (wordItems.length > 0) {
      // Take screenshot of first word item
      await wordItems[0].screenshot({ path: 'word_item_1.png' });
      console.log('Screenshot: word_item_1.png saved');

      if (wordItems.length > 1) {
        await wordItems[1].screenshot({ path: 'word_item_2.png' });
        console.log('Screenshot: word_item_2.png saved');
      }
    }

    // Get detailed styles
    const detailedStyles = await page.evaluate(() => {
      const wordItems = document.querySelectorAll('.space-y-px > div');
      const results = [];

      wordItems.forEach((item, index) => {
        const chineseSpan = item.querySelector('.font-chinese-serif');
        const pinyinSpan = item.querySelector('.font-body.italic');

        if (chineseSpan) {
          const computed = window.getComputedStyle(chineseSpan);
          const parent = chineseSpan.parentElement;
          const parentComputed = window.getComputedStyle(parent);

          results.push({
            index,
            chinese: chineseSpan.textContent,
            styles: {
              textDecoration: computed.textDecoration,
              borderBottom: computed.borderBottom,
              boxShadow: computed.boxShadow,
              lineHeight: computed.lineHeight,
              paddingBottom: computed.paddingBottom,
              fontSize: computed.fontSize,
              fontFamily: computed.fontFamily,
              display: computed.display,
              verticalAlign: computed.verticalAlign,
            },
            parentStyles: {
              display: parentComputed.display,
              alignItems: parentComputed.alignItems,
              gap: parentComputed.gap,
              borderBottom: parentComputed.borderBottom,
              background: parentComputed.background,
            }
          });
        }
      });

      return results;
    });

    console.log('Detailed styles:', JSON.stringify(detailedStyles, null, 2));
    fs.writeFileSync('vocab_styles.json', JSON.stringify(detailedStyles, null, 2));

    // Check for any ::before or ::after pseudo-elements
    const pseudoElements = await page.evaluate(() => {
      const chineseSpans = document.querySelectorAll('.font-chinese-serif');
      const results = [];

      chineseSpans.forEach((span, index) => {
        const before = window.getComputedStyle(span, '::before');
        const after = window.getComputedStyle(span, '::after');

        results.push({
          index,
          text: span.textContent,
          before: {
            content: before.content,
            display: before.display,
            borderBottom: before.borderBottom,
            height: before.height,
            width: before.width,
          },
          after: {
            content: after.content,
            display: after.display,
            borderBottom: after.borderBottom,
            height: after.height,
            width: after.width,
          }
        });
      });

      return results;
    });

    console.log('Pseudo elements:', JSON.stringify(pseudoElements, null, 2));
    fs.writeFileSync('pseudo_elements.json', JSON.stringify(pseudoElements, null, 2));

    console.log('Waiting 15 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 15000));

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'vocab_error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
