import mongoose from "mongoose";

const LessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },         // full paragraph text
    dict: { type: Map, of: String, default: {} },      // {"word":"meaning"}
  },
  { timestamps: true }
);

export default mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
