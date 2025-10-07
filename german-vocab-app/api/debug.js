import { dbConnect } from "../lib/mongo";
import Lesson from "../models/Lesson";
import Flashcard from "../models/Flashcard";

export default async function handler(req, res) {
  await dbConnect();
  const lessons = await Lesson.countDocuments();
  const cards = await Flashcard.countDocuments();
  res.status(200).json({ lessons, cards });
}
