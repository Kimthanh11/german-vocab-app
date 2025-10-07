import { dbConnect } from "../lib/mongo";
import Lesson from "../models/Lesson";
import Flashcard from "../models/Flashcard";
import { readJson } from "./_utils";
import { toClient, toClientArray } from "./_toClient";

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === "GET") {
      const docs = await Lesson.find({}).sort({ createdAt: -1 });
      return res.status(200).json(toClientArray(docs));
    }

    if (req.method === "POST") {
      const { id, title, content, dict } = await readJson(req);
      if (!title || !content) return res.status(400).json({ error: "title and content are required" });

      let doc;
      if (id) {
        doc = await Lesson.findByIdAndUpdate(
          id,
          { title, content, dict: dict || {} },
          { new: true }
        );
      } else {
        doc = await Lesson.create({ title, content, dict: dict || {} });
      }
      return res.status(id ? 200 : 201).json(toClient(doc));
    }

    if (req.method === "DELETE") {
      const { id } = await readJson(req);
      if (!id) return res.status(400).json({ error: "id required" });
      // detach flashcards that pointed to this lesson
      await Flashcard.updateMany({ lessonId: id }, { $set: { lessonId: null } });
      await Lesson.findByIdAndDelete(id);
      return res.status(204).end();
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
