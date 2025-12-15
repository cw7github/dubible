import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 375, height: 812 }, // iPhone X size
    args: ['--window-size=375,812']
  });

  const page = await browser.newPage();

  try {
    console.log('Navigating to localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Page loaded');

    // Take initial screenshot
    await page.screenshot({ path: 'screenshot_1_initial.png', fullPage: true });
    console.log('Screenshot 1: Initial page saved');

    // Try to find and click on Chinese characters to save them
    // Look for Chinese text in the page
    console.log('Looking for Chinese text to click...');

    // First, let's see if we can find the vocabulary button
    const vocabButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const vocabBtn = buttons.find(btn => btn.textContent.includes('VOCABULARY') || btn.textContent.includes('Vocabulary'));
      return vocabBtn ? true : false;
    });

    console.log('Vocab button found:', vocabButton);

    // Try to find and click Chinese characters
    // First check if there's any Chinese text visible
    const chineseText = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const chineseTexts = [];
      let node;
      while (node = walker.nextNode()) {
        if (/[\u4e00-\u9fff]/.test(node.textContent)) {
          chineseTexts.push({
            text: node.textContent.trim(),
            parent: node.parentElement?.tagName
          });
        }
      }
      return chineseTexts;
    });

    console.log('Chinese text found:', chineseText);

    // Try clicking on some Chinese characters
    if (chineseText.length > 0) {
      // Find clickable Chinese text
      const clickableElements = await page.$$('span, button, div');
      for (const element of clickableElements) {
        const text = await element.evaluate(el => el.textContent);
        if (/[\u4e00-\u9fff]/.test(text)) {
          console.log('Clicking on:', text.substring(0, 20));
          await element.click();
          await new Promise(resolve => setTimeout(resolve, 500));

          // Check if a modal or popup appeared
          const hasModal = await page.evaluate(() => {
            return document.querySelector('[role="dialog"], .modal, .popup') !== null;
          });

          if (hasModal) {
            console.log('Modal appeared, taking screenshot');
            await page.screenshot({ path: 'screenshot_2_modal.png', fullPage: true });

            // Try to save the word - look for save button
            const saved = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const saveBtn = buttons.find(btn =>
                btn.textContent.toLowerCase().includes('save') ||
                btn.textContent.includes('保存')
              );
              if (saveBtn) {
                saveBtn.click();
                return true;
              }
              return false;
            });

            if (saved) {
              console.log('Word saved');
              await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Close modal if still open
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Save a few words
          if (clickableElements.indexOf(element) >= 3) break;
        }
      }
    }

    // Now try to open the vocabulary screen
    console.log('Looking for vocabulary button...');
    const vocabOpened = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const vocabBtn = buttons.find(btn =>
        btn.textContent.includes('VOCABULARY') ||
        btn.textContent.includes('Vocabulary') ||
        btn.getAttribute('aria-label')?.includes('vocabulary')
      );
      if (vocabBtn) {
        vocabBtn.click();
        return true;
      }

      // Try looking for an icon that might be vocabulary
      const svgButtons = Array.from(document.querySelectorAll('button svg'));
      for (const svg of svgButtons) {
        const parent = svg.closest('button');
        if (parent) {
          // Look for book or list icon
          const paths = svg.querySelectorAll('path');
          if (paths.length > 0) {
            parent.click();
            return true;
          }
        }
      }
      return false;
    });

    console.log('Vocabulary opened:', vocabOpened);
    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.screenshot({ path: 'screenshot_3_vocabulary.png', fullPage: true });
    console.log('Screenshot 3: Vocabulary screen saved');

    // Inject some test words directly into localStorage if vocabulary is empty
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
          srsData: { status: 'learning', level: 0, nextReview: new Date().toISOString() }
        }
      ];

      const existingStore = JSON.parse(localStorage.getItem('vocabulary-store') || '{}');
      existingStore.state = existingStore.state || {};
      existingStore.state.words = testWords;
      localStorage.setItem('vocabulary-store', JSON.stringify(existingStore));
    });

    console.log('Reloading page to show injected words...');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to open vocabulary again
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const vocabBtn = buttons.find(btn =>
        btn.textContent.includes('VOCABULARY') ||
        btn.textContent.includes('Vocabulary')
      );
      if (vocabBtn) {
        vocabBtn.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    await page.screenshot({ path: 'screenshot_4_with_words.png', fullPage: true });
    console.log('Screenshot 4: Vocabulary with injected words saved');

    // Take a zoomed screenshot of the word list
    const wordElements = await page.$$('.font-chinese-serif');
    if (wordElements.length > 0) {
      console.log('Taking close-up of Chinese characters...');
      const firstWord = wordElements[0];
      await firstWord.screenshot({ path: 'screenshot_5_closeup.png' });
      console.log('Screenshot 5: Close-up of Chinese character saved');
    }

    // Get computed styles of the Chinese text
    const styles = await page.evaluate(() => {
      const chineseElements = document.querySelectorAll('.font-chinese-serif');
      return Array.from(chineseElements).map(el => {
        const computed = window.getComputedStyle(el);
        return {
          text: el.textContent,
          textDecoration: computed.textDecoration,
          borderBottom: computed.borderBottom,
          boxShadow: computed.boxShadow,
          background: computed.background,
          lineHeight: computed.lineHeight,
          paddingBottom: computed.paddingBottom,
          marginBottom: computed.marginBottom,
          position: computed.position,
          display: computed.display
        };
      });
    });

    console.log('Chinese text styles:', JSON.stringify(styles, null, 2));
    fs.writeFileSync('styles_debug.json', JSON.stringify(styles, null, 2));

    console.log('Keeping browser open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'screenshot_error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
