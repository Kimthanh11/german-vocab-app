import mongoose from "mongoose";

const ContextSchema = new mongoose.Schema(
  {
    sentence: { type: String, required: true },
    start: { type: Number, default: -1 }, // optional, index in sentence
    end: { type: Number, default: -1 },
  },
  { _id: false }
);

const FlashcardSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, index: true },
    meaning: { type: String, required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
    contexts: { type: [ContextSchema], default: [] }, // <— NEW
  },
  { timestamps: true }
);

export default mongoose.models.Flashcard || mongoose.model("Flashcard", FlashcardSchema);
