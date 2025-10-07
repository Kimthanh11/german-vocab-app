// App.jsx
import React, { useEffect, useState } from "react";
import Home from "./Home";
import CreateLesson from "./CreateLesson";
import Flashcards from "./Flashcards";
import "./index.css";
import { api } from "../lib/api";

export default function App() {
  const [route, setRoute] = useState("home");
  const [flashcards, setFlashcards] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);

  useEffect(() => {
    const L = localStorage.getItem("lessons");
    const C = localStorage.getItem("flashcards");
    if (L) setLessons(JSON.parse(L));
    if (C) setFlashcards(JSON.parse(C));
  }, []);
  useEffect(() => localStorage.setItem("lessons", JSON.stringify(lessons)), [lessons]);
  useEffect(() => localStorage.setItem("flashcards", JSON.stringify(flashcards)), [flashcards]);

  const addFlashcard = (term, meaning) => {
    setFlashcards((prev) => {
      const exists = prev.some((c) => c.term.toLowerCase() === term.toLowerCase());
      return exists ? prev : [...prev, { term, meaning }];
    });
  };

  const saveLesson = async (lesson) => {
    const saved = await api.saveLesson(lesson);
    setLessons((prev) => {
      const idx = prev.findIndex((l) => l.id === lesson.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = lesson; return copy; }
      return [lesson, ...prev];
    });
    return saved;
  };

  const openLesson = (lesson) => { setSelectedLesson(lesson); setRoute("create"); };

  // ❌ Delete a LESSON
  const deleteLesson = (id) => {
    if (!confirm("Delete this lesson?")) return;
    setLessons((prev) => prev.filter((l) => l.id !== id));
    if (selectedLesson?.id === id) setSelectedLesson(null);
  };

  // ❌ Delete a FLASHCARD (by term)
  const deleteFlashcard = (term) => {
    if (!confirm(`Delete flashcard "${term}"?`)) return;
    setFlashcards((prev) => prev.filter((c) => c.term !== term));
  };

  return (
    <div className="min-h-screen w-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-3xl p-4">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-indigo-600">Deutsch Lern-App</h1>
          <nav className="flex gap-2">
            <button className="px-3 py-2 rounded bg-white shadow" onClick={() => { setSelectedLesson(null); setRoute("home"); }}>Home</button>
            <button className="px-3 py-2 rounded bg-white shadow" onClick={() => { setSelectedLesson(null); setRoute("create"); }}>Create</button>
            <button className="px-3 py-2 rounded bg-white shadow" onClick={() => setRoute("flashcards")}>Flashcards</button>
          </nav>
        </header>

        {route === "home" && (
          <Home
            onCreateLesson={() => { setSelectedLesson(null); setRoute("create"); }}
            onOpenFlashcards={() => setRoute("flashcards")}
            lessons={lessons}
            onOpenLesson={openLesson}
            onDeleteLesson={deleteLesson}       // ← pass down
          />
        )}

        {route === "create" && (
          <CreateLesson
            initialLesson={selectedLesson}
            onBack={() => setRoute("home")}
            onSavedLesson={saveLesson}
            onAddFlashcard={addFlashcard}
          />
        )}

        {route === "flashcards" && (
          <Flashcards
            cards={flashcards}
            onBack={() => setRoute("home")}
            onDeleteCard={deleteFlashcard}     // ← pass down
          />
        )}
      </div>
    </div>
  );
}
