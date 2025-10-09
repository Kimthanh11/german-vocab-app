import { dbConnect } from "../lib/mongo.js";
import Flashcard from "../models/Flashcard.js";
import Lesson from "../models/Lesson.js";

const toClient = (doc) => {
  const o = doc.toObject ? doc.toObject({ depopulate: true, versionKey: false }) : doc;
  const { _id, ...rest } = o;
  return { id: String(_id), ...rest };
};

const read = (req) => new Promise(r => {
  let d=""; req.on("data",c=>d+=c);
  req.on("end",()=>{ try{ r(d?JSON.parse(d):{}) } catch{ r({}) } });
});

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === "GET") {
      const docs = await Flashcard.find({}).sort({ createdAt: -1 });
      return res.status(200).json(docs.map(toClient));
    }

    if (req.method === "POST") {
      const { term, meaning, lesson_id, context } = await read(req);
      if (!term || !meaning) return res.status(400).json({ error: "term/meaning required" });

      // Upsert by (term, lessonId)
      const filter = { term, lessonId: lesson_id || null };
      let doc = await Flashcard.findOne(filter).collation({ locale: "en", strength: 2 });

      if (!doc) {
        doc = await Flashcard.create({ term, meaning, lessonId: lesson_id || null, contexts: [] });
      } else {
        // keep meaning up to date
        if (doc.meaning !== meaning) doc.meaning = meaning;
      }

      // Push context if provided and not duplicate
      if (context?.sentence) {
        const s = String(context.sentence).trim();
        const exists = doc.contexts.some(c =>
          c.sentence.trim().toLowerCase() === s.toLowerCase()
        );
        if (!exists) {
          doc.contexts.push({
            sentence: s,
            start: Number.isFinite(context.start) ? context.start : -1,
            end: Number.isFinite(context.end) ? context.end : -1,
          });
        }
      }

      await doc.save();

      // Optional: sync lesson.dict too
      if (lesson_id) {
        const l = await Lesson.findById(lesson_id);
        if (l) {
          if (!l.dict) l.dict = new Map();
          l.dict.set(term, meaning);
          await l.save();
        }
      }

      return res.status(201).json(toClient(doc));
    }

    if (req.method === "DELETE") {
      // … (your existing delete; no change needed)
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("FLASHCARDS API ERROR:", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
