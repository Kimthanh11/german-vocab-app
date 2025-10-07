// Home.jsx
import React from "react";
import OldLessons from "./OldLessons";

export default function Home({ onCreateLesson, onOpenFlashcards, lessons, onOpenLesson, onDeleteLesson }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-4">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={onCreateLesson}>
          Create New Lesson
        </button>
        <button className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700" onClick={onOpenFlashcards}>
          Flashcards
        </button>
      </div>
      <OldLessons lessons={lessons ?? []} onOpenLesson={onOpenLesson} onDeleteLesson={onDeleteLesson} />
    </div>
  );
}
