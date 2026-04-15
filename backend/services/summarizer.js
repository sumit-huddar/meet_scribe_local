const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function summarizeMeeting(transcripts, title = 'Meeting') {
  let fullText = '';

  if (Array.isArray(transcripts) && transcripts.length > 0) {
    fullText = transcripts.map(t => `[${t.timestamp}] ${t.text}`).join('\n');
  } else {
    fullText = 'No transcript available.';
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `You are an expert meeting summarizer. Below is the transcript of "${title}".

TRANSCRIPT:
${fullText}

Write a structured summary with these sections:
1. **Meeting Overview** — 2-3 sentences on what the meeting covered.
2. **Key Discussion Points** — bullet points of the main topics.
3. **Decisions Made** — any conclusions reached.
4. **Action Items** — tasks, with the person responsible if mentioned.
5. **Next Steps** — follow-ups or deadlines mentioned.

If the transcript is empty or too short, say so clearly.`
      }
    ],
  });

  return completion.choices[0].message.content;
}

module.exports = { summarizeMeeting };