import axios from 'axios';
import dotenv from 'dotenv';
import * as browser from '../tools/browser.js';
import * as aiService from './aiService.js';

dotenv.config();

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export async function publishPost(message: string) {
  if (!PAGE_ID || !ACCESS_TOKEN || PAGE_ID === 'your_page_id' || ACCESS_TOKEN === 'your_access_token') {
    console.log('Facebook Page ID or Access Token is missing or not configured. Skipping post.');
    return;
  }

  try {
    const url = `https://graph.facebook.com/v22.0/${PAGE_ID}/feed`;
    await axios.post(url, {
      message,
      access_token: ACCESS_TOKEN
    });
    console.log('Successfully published post to Facebook.');
  } catch (error) {
    console.error('Error publishing to Facebook:', error);
  }
}

export async function runTrendAnalysisAndPost(topic: string = 'Technology') {
  console.log(`Running trend analysis for topic: ${topic}`);
  
  // 1. Search for trends
  const searchResults = await browser.search(`${topic} latest trends news 2026`);
  
  // 2. Extract content from top link
  let extractedText = '';
  if (searchResults.length > 0) {
    const firstResult = searchResults[0];
    if (firstResult) {
      extractedText = await browser.extractText(firstResult);
    }
  }

  // 3. Generate post content
  const prompt = `Based on the following news/trends: "${extractedText.substring(0, 1000)}", generate an engaging and professional Facebook post for a page about ${topic}. Keep it concise.`;
  const result = await aiService.generateResponse(prompt, []);
  const postContent = result.content;

  // 4. Publish
  if (postContent && postContent !== 'Error generating response.' && postContent !== 'Sorry, I am having trouble thinking right now.') {
    await publishPost(postContent);
  }
}
