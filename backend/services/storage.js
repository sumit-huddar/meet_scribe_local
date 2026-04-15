const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  sessionId: String,
  title: String,
  meetUrl: String,
  startTime: String,
  endTime: String,
  transcripts: Array,
  summary: String,
  createdAt: { type: Date, default: Date.now },
});

const Summary = mongoose.models.Summary || mongoose.model('Summary', summarySchema);

async function connect() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

async function saveSummary(sessionId, data) {
  await connect();
  await Summary.create({ sessionId, ...data });
}

async function listSummaries() {
  await connect();
  return Summary.find().sort({ createdAt: -1 });
}

async function getSummary(sessionId) {
  await connect();
  return Summary.findOne({ sessionId });
}

async function deleteSummary(sessionId) {
  await connect();
  await Summary.deleteOne({ sessionId });
}

module.exports = { saveSummary, listSummaries, getSummary, deleteSummary };