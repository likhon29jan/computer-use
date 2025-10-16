import { chromium, Browser, Page } from 'playwright';

export interface PlaywrightEnvironment {
  browser: Browser;
  page: Page;
}

export async function setupBrowserEnvironment(): Promise<PlaywrightEnvironment> {
  const browser = await chromium.launch({
    headless: false,
    chromiumSandbox: true,
    env: {}, // Empty to avoid exposing host env vars
    args: [
      '--disable-extensions',
      '--disable-file-system'
    ]
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1024, height: 768 });

  return { browser, page };
}

export async function capturePlaywrightScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot();
  return buffer.toString('base64');
}

export async function closeBrowserEnvironment(browser: Browser): Promise<void> {
  await browser.close();
}

export async function executePlaywrightAction(page: Page, action: any) {
  switch (action.action) {
    case 'click':
      await page.mouse.click(action.x, action.y);
      break;

    case 'type':
      await page.keyboard.type(action.text);
      break;

    case 'scroll':
      await page.mouse.wheel(action.scrollX || 0, action.scrollY || 0);
      break;

    case 'keypress':
      for (const key of action.keys) {
        await page.keyboard.press(key);
      }
      break;

    case 'wait':
      await page.waitForTimeout(2000);
      break;

    case 'screenshot':
      // Screenshot captured separately
      break;
  }
}