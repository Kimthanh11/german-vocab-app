// scripts/migrate-contexts.mjs
import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Minimal inline models so the script runs independent of your app ---
const LessonSchema = new mongoose.Schema({
  title: String,
  content: String,
  dict: { type: Map, of: String, default: {} },
}, { timestamps: true });

const ContextSchema = new mongoose.Schema({
  sentence: { type: String, required: true },
  start: { type: Number, default: -1 },
  end: { type: Number, default: -1 },
}, { _id: false });

const FlashcardSchema = new mongoose.Schema({
  term: { type: String, required: true },
  meaning: { type: String, required: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
  contexts: { type: [ContextSchema], default: [] },
}, { timestamps: true });

FlashcardSchema.index({ term: 1, lessonId: 1 });

const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);
const Flashcard = mongoose.models.Flashcard || mongoose.model('Flashcard', FlashcardSchema);

// --- helpers ---
function extractSentenceContext(fullText, term) {
  if (!fullText || !term) return null;

  const sentences = fullText
    .split(/\n\s*\n+/)                 // paragraphs
    .flatMap(p => p.split(/(?<=[\.\?\!\:\;])\s+|\n+/)); // sentences

  const lt = term.toLowerCase();
  for (const s of sentences) {
    const idx = s.toLowerCase().indexOf(lt);
    if (idx !== -1) {
      return { sentence: s.trim(), start: idx, end: idx + term.length };
    }
  }
  // fallback: 120-char window around first match in whole text
  const pos = fullText.toLowerCase().indexOf(lt);
  if (pos !== -1) {
    const start = Math.max(0, pos - 60);
    const end = Math.min(fullText.length, pos + term.length + 60);
    const sentence = fullText.slice(start, end).trim();
    return { sentence, start: pos - start, end: pos - start + term.length };
  }
  return null;
}

async function main() {
  const { MONGODB_URI, MONGODB_DB } = process.env;
  if (!MONGODB_URI) throw new Error('MONGODB_URI missing (put it in .env.local)');

  await mongoose.connect(MONGODB_URI, {
    dbName: MONGODB_DB || 'deutsch-app',
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 20000,
    family: 4,
  });

  console.log('Connected to Mongo:', mongoose.connection.name);

  // 1) Ensure contexts field exists
  const res1 = await Flashcard.updateMany(
    { contexts: { $exists: false } },
    { $set: { contexts: [] } }
  );
  console.log('Initialized contexts on docs:', res1.modifiedCount);

  // 2) Backfill from lessons where possible (idempotent)
  const cursor = Flashcard.find({}).cursor();
  let processed = 0, updated = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    processed++;
    if (doc.contexts && doc.contexts.length > 0) continue; // already has contexts

    if (!doc.lessonId) continue; // no linked lesson to extract from

    const lesson = await Lesson.findById(doc.lessonId).lean();
    if (!lesson?.content) continue;

    const ctx = extractSentenceContext(lesson.content, doc.term);
    if (!ctx) continue;

    // de-dupe by sentence text, case-insensitive
    const exists = (doc.contexts || []).some(c =>
      (c.sentence || '').trim().toLowerCase() === ctx.sentence.toLowerCase()
    );
    if (exists) continue;

    doc.contexts.push(ctx);
    await doc.save();
    updated++;
    if (updated % 50 === 0) console.log(`Updated ${updated} cards…`);
  }

  console.log(`Done. Processed: ${processed}, Updated with context: ${updated}`);
  await mongoose.disconnect();
  console.log('Disconnected.');
}

main().catch(async (e) => {
  console.error('MIGRATION ERROR:', e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
