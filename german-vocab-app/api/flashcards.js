// api/flashcards.js
import { dbConnect } from "../lib/mongo.js";
import Flashcard from "../models/Flashcard.js";
import Lesson from "../models/Lesson.js";

const toClient = (doc) => {
  const o = doc.toObject ? doc.toObject({ depopulate: true, versionKey: false }) : doc;
  const { _id, ...rest } = o;
  return { id: String(_id), ...rest };
};
const read = (req) => new Promise(r => {
  let d=""; req.on("data",c=>d+=c); req.on("end",()=>{ try{ r(d?JSON.parse(d):{}) } catch{ r({}) }});
});

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === "GET") {
      const docs = await Flashcard.find({}).sort({ createdAt: -1 });
      return res.status(200).json(docs.map(toClient));
    }

    if (req.method === "POST") {
      const { term, meaning, lesson_id } = await read(req);
      if (!term || !meaning) return res.status(400).json({ error: "term/meaning required" });

      // Upsert flashcard (case-insensitive by term + lessonId)
      let doc = await Flashcard.findOne({ term, lessonId: lesson_id || null })
        .collation({ locale: "en", strength: 2 });
      if (!doc) doc = await Flashcard.create({ term, meaning, lessonId: lesson_id || null });
      else {
        doc.meaning = meaning;
        await doc.save();
      }

      // Keep lesson.dict in sync if lesson_id present
      if (lesson_id) {
        const l = await Lesson.findById(lesson_id);
        if (l) {
          // dict is a Map in schema; use Map API to avoid dot-path issues
          if (!l.dict) l.dict = new Map();
          l.dict.set(term, meaning);
          await l.save();
        }
      }

      return res.status(201).json(toClient(doc));
    }

    if (req.method === "DELETE") {
      const { id, term, lesson_id } = await read(req);
      if (!id && !term) return res.status(400).json({ error: "id or term required" });

      let doc = null;
      if (id) {
        doc = await Flashcard.findById(id);
        if (doc) await Flashcard.findByIdAndDelete(id);
      } else {
        // delete by term (+ optional lesson_id)
        const filter = { term };
        if (lesson_id !== undefined) filter.lessonId = lesson_id || null;
        doc = await Flashcard.findOne(filter).collation({ locale: "en", strength: 2 });
        await Flashcard.deleteMany(filter);
      }

      // Remove from the lesson dict (only that lesson) if we know which
      const targetLessonId = lesson_id || doc?.lessonId;
      if (targetLessonId && term) {
        const l = await Lesson.findById(targetLessonId);
        if (l && l.dict instanceof Map) {
          l.dict.delete(term);
          await l.save();
        }
      }

      return res.status(204).end();
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("FLASHCARDS API ERROR:", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
