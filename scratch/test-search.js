import * as browser from '../src/tools/browser.js';
async function test() {
    console.log('Testing search for "weather in Singapore"...');
    try {
        const results = await browser.search('weather in Singapore');
        console.log('Search Results:', results);
        if (results.length > 0) {
            console.log('Testing extraction from first result...');
            const text = await browser.extractText(results[0]);
            console.log('Extracted Text Length:', text.length);
            console.log('Extracted Text (first 200 chars):', text.substring(0, 200));
        }
        else {
            console.log('❌ No results found.');
        }
    }
    catch (error) {
        console.error('Test failed:', error);
    }
    finally {
        await browser.closeBrowser();
    }
}
test();
//# sourceMappingURL=test-search.js.map