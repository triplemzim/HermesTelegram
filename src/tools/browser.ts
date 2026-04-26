import puppeteer, { Browser, Page } from 'puppeteer';

let browser: Browser | null = null;

export async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function search(query: string): Promise<string[]> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    const links = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.result__a'));
      return results.map(res => (res as HTMLAnchorElement).href).slice(0, 5);
    });
    
    return links;
  } catch (error) {
    console.error(`Error searching for ${query}:`, error);
    return [];
  } finally {
    await page.close();
  }
}

export async function extractText(url: string): Promise<string> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    const text = await page.evaluate(() => document.body.innerText);
    return text;
  } catch (error) {
    console.error(`Error extracting text from ${url}:`, error);
    return '';
  } finally {
    await page.close();
  }
}
