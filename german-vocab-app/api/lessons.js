// api/lessons.js
import { dbConnect } from "../lib/mongo.js";
import mongoose from "mongoose";
import Lesson from "../models/Lesson.js";
import Flashcard from "../models/Flashcard.js";

const toClient = (doc) => {
  const o = doc.toObject ? doc.toObject({ depopulate: true, versionKey: false }) : doc;
  if (o && o.dict && o.dict instanceof Map) o.dict = Object.fromEntries(o.dict.entries());
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
      const docs = await Lesson.find({}).sort({ createdAt: -1 });
      return res.status(200).json(docs.map(toClient));
    }

    if (req.method === "POST") {
      const { id, title, content, dict } = await read(req);
      if (!title || !content) return res.status(400).json({ error: "title/content required" });
      const data = { title, content, dict: dict || {} };

      let doc = null;
      if (id && mongoose.isValidObjectId(id)) doc = await Lesson.findByIdAndUpdate(id, data, { new: true });
      if (!doc) doc = await Lesson.create(data);

      return res.status(201).json(toClient(doc));
    }

    if (req.method === "DELETE") {
      const { id } = await read(req);
      if (!id) return res.status(400).json({ error: "id required" });

      // 1) delete the lesson
      await Lesson.findByIdAndDelete(id).catch(() => {});

      // 2) cascade: delete its flashcards
      await Flashcard.deleteMany({ lessonId: id }).catch(() => {});

      return res.status(204).end();
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("LESSONS API ERROR:", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
