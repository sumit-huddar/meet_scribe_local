require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { joinMeetAndTranscribe } = require('./bot/meetBot');
const { summarizeMeeting } = require('./services/summarizer');
const { saveSummary, listSummaries, getSummary, deleteSummary } = require('./services/storage');

const app = express();
app.use(cors());
app.use(express.json());

const sessions = {};

app.post('/api/sessions', async (req, res) => {
  const { meetUrl, title } = req.body;
  if (!meetUrl) return res.status(400).json({ error: 'meetUrl is required' });

  const sessionId = uuidv4();
  const transcripts = [];

  try {
    const bot = await joinMeetAndTranscribe(meetUrl, sessionId, (t) => transcripts.push(t));
    sessions[sessionId] = { sessionId, title: title || 'Untitled', meetUrl, bot, transcripts, status: 'active', startTime: new Date().toISOString() };
    res.json({ sessionId, status: 'active' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:id', (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json({ sessionId: s.sessionId, status: s.status, title: s.title, startTime: s.startTime, transcripts: s.transcripts });
});

app.post('/api/sessions/:id/stop', async (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: 'Not found' });

  try {
    await s.bot.stop();
  } catch(e) {
    console.error('Bot stop error:', e.message);
  }

  try {
    const transcripts = s.transcripts.length > 0 ? s.transcripts : [{ text: 'No audio was captured during this meeting.', timestamp: new Date().toISOString() }];
    const summary = await summarizeMeeting(transcripts, s.title);
    const data = { title: s.title, meetUrl: s.meetUrl, startTime: s.startTime, endTime: new Date().toISOString(), transcripts: s.transcripts, summary };
    await saveSummary(s.sessionId, data);
    s.status = 'completed';
    res.json({ sessionId: s.sessionId, summary });
  } catch(e) {
    console.error('Summary error:', e.message);
    res.status(500).json({ error: 'Failed to summarize: ' + e.message });
  }
});

app.get('/api/summaries', async (req, res) => {
  try { res.json(await listSummaries()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/summaries/:id', async (req, res) => {
  try { res.json(await getSummary(req.params.id)); }
  catch (e) { res.status(404).json({ error: 'Not found' }); }
});

app.delete('/api/summaries/:id', async (req, res) => {
  try {
    console.log('Deleting:', req.params.id);
    await deleteSummary(req.params.id);
    res.json({ success: true });
  } catch(e) {
    console.error('Delete error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 3001, () => console.log('Server running'));