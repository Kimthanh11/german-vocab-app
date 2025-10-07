import { dbConnect } from "../lib/mongo";
import Flashcard from "../models/Flashcard";
import { readJson } from "./_utils";
import { toClient, toClientArray } from "./_toClient";

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === "GET") {
      const docs = await Flashcard.find({}).sort({ createdAt: -1 });
      return res.status(200).json(toClientArray(docs));
    }

    if (req.method === "POST") {
      const { term, meaning, lesson_id } = await readJson(req);
      if (!term || !meaning) return res.status(400).json({ error: "term and meaning required" });

      try {
        const doc = await Flashcard.create({
          term,
          meaning,
          lessonId: lesson_id || null,
        });
        return res.status(201).json(toClient(doc));
      } catch (err) {
        // Handle duplicate term (E11000)
        if (err?.code === 11000) {
          const existing = await Flashcard.findOne({ term }).collation({ locale: "en", strength: 2 });
          return res.status(200).json(toClient(existing));
        }
        throw err;
      }
    }

    if (req.method === "DELETE") {
      const { id, term } = await readJson(req);
      if (!id && !term) return res.status(400).json({ error: "id or term required" });

      if (id) await Flashcard.findByIdAndDelete(id);
      else await Flashcard.deleteMany({ term });
      return res.status(204).end();
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
