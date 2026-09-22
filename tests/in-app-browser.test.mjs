import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInAppBrowser } from '../lib/inAppBrowser.js';

const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
const GOOGLE_APP_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/253.0.615166893 Mobile/15E148 Safari/604.1';
const INSTAGRAM_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.0.0';

test('Safari e Chrome de verdade não são marcados como navegador embutido', () => {
  assert.equal(isInAppBrowser(SAFARI_IOS), false);
  assert.equal(isInAppBrowser(CHROME_ANDROID), false);
});

test('webview do app do Google (GSA) é marcada como navegador embutido', () => {
  assert.equal(isInAppBrowser(GOOGLE_APP_IOS), true);
});

test('webview do Instagram é marcada como navegador embutido', () => {
  assert.equal(isInAppBrowser(INSTAGRAM_IOS), true);
});

test('sem user-agent não quebra, só não marca', () => {
  assert.equal(isInAppBrowser(''), false);
  assert.equal(isInAppBrowser(undefined), false);
});
