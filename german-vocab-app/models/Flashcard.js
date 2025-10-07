import mongoose from "mongoose";

const FlashcardSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, index: true },
    meaning: { type: String, required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
  },
  { timestamps: true }
);

// Case-insensitive unique on term:
FlashcardSchema.index({ term: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export default mongoose.models.Flashcard || mongoose.model("Flashcard", FlashcardSchema);
