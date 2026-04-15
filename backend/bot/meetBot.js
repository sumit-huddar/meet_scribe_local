const puppeteer = require('puppeteer');

async function joinMeetAndTranscribe(meetUrl, sessionId, onTranscript) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--enable-speech-dispatcher',
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
  );

  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://meet.google.com', ['microphone', 'camera']);

  console.log(`[Bot ${sessionId}] Logging into Google...`);
  await page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle2' });

  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', process.env.GOOGLE_BOT_EMAIL, { delay: 50 });
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 4000));

  try {
    await page.waitForSelector('input[type="password"]', { visible: true, timeout: 8000 });
  } catch(e) {
    try {
      const nextBtn = await page.$('#identifierNext, [jsname="LgbsSe"]');
      if (nextBtn) await nextBtn.click();
      await new Promise(r => setTimeout(r, 3000));
    } catch(e2) {}
  }

  try {
    await page.waitForSelector('input[type="password"]', { visible: true, timeout: 8000 });
    await page.type('input[type="password"]', process.env.GOOGLE_BOT_PASSWORD, { delay: 50 });
    await page.keyboard.press('Enter');
  } catch(e) {
    console.log('[Bot] Password field issue:', e.message);
  }

  await new Promise(r => setTimeout(r, 6000));
  console.log(`[Bot ${sessionId}] Logged in`);

  console.log(`[Bot ${sessionId}] Going to ${meetUrl}`);
  await page.goto(meetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));

  try {
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Join') || text.includes('Ask to join')) {
        await btn.click();
        console.log(`[Bot ${sessionId}] Clicked join`);
        break;
      }
    }
  } catch(e) {
    console.log('[Bot] Could not find join button:', e.message);
  }

  await new Promise(r => setTimeout(r, 5000));

  await page.evaluate(() => {
    window._transcripts = [];
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          window._transcripts.push(event.results[i][0].transcript);
        }
      }
    };
    recognition.onerror = (e) => console.log('Speech error:', e.error);
    recognition.start();
  });

  const transcripts = [];

  const interval = setInterval(async () => {
    try {
      const newTexts = await page.evaluate(() => {
        if (!window._transcripts) return [];
        const data = [...window._transcripts];
        window._transcripts = [];
        return data;
      });

      if (!Array.isArray(newTexts)) return;

      for (const text of newTexts) {
        if (text && typeof text === 'string' && text.length > 5) {
          const entry = { text, timestamp: new Date().toISOString() };
          transcripts.push(entry);
          onTranscript(entry);
          console.log('[Transcript]', text);
        }
      }
    } catch(e) {
      console.error('Polling error:', e.message);
    }
  }, 3000);

  return {
    stop: async () => {
      clearInterval(interval);
      try { await browser.close(); } catch(e) {}
    },
    getTranscripts: () => transcripts,
  };
}

module.exports = { joinMeetAndTranscribe };