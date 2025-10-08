// src/App.jsx
import React, { useEffect, useState } from "react";
import Home from "./Home";
import CreateLesson from "./CreateLesson";
import Flashcards from "./Flashcards";
import "./index.css";
import { api } from "../lib/api";

export default function App() {
  const [route, setRoute] = useState("home");
  const [lessons, setLessons] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Load from server (Mongo) on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [L, C] = await Promise.all([
          api.listLessons(),
          api.listFlashcards(),
        ]);
        setLessons(L || []);
        setFlashcards(C || []);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Add/merge a flashcard (server first)
  const addFlashcard = async (term, meaning, lesson_id) => {
    try {
      const saved = await api.addFlashcard({ term, meaning, lesson_id });
      setFlashcards((prev) => {
        const exists = prev.some((c) =>
          (saved?.id && c.id === saved.id) ||
          c.term.toLowerCase() === term.toLowerCase()
        );
        return exists ? prev : [saved, ...prev];
      });
    } catch (e) {
      alert(`Failed to add flashcard: ${e.message}`);
    }
  };

  // Create or update a lesson (server is source of truth)
  const saveLesson = async (lesson) => {
    try {
      const saved = await api.saveLesson(lesson); // returns { id, ... }
      setLessons((prev) => {
        const idx = prev.findIndex((l) => l.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
      return saved; // important so CreateLesson can capture saved.id
    } catch (e) {
      alert(`Failed to save lesson: ${e.message}`);
      throw e;
    }
  };

  const reloadLessons = async () => {
  try {
    const L = await api.listLessons();
    setLessons(L || []);
  } catch (e) {
    console.error(e);
  }
};

  const openLesson = (lesson) => {
    setSelectedLesson(lesson);
    setRoute("create");
  };

  const deleteLesson = async (id) => {
  if (!confirm("Delete this lesson?")) return;

  // optimistic UI
  setLessons(prev => prev.filter(l => l.id !== id));
  if (selectedLesson?.id === id) {
    setSelectedLesson(null);
    setRoute("home"); // go back to list if you were in editor
  }

  try {
    await api.deleteLesson(id);      // server delete (204)
    reloadLessons();                 // background re-fetch to stay in sync
  } catch (e) {
    alert(`Failed to delete lesson: ${e.message}`);
    reloadLessons();                 // recover UI if optimistic update was wrong
  }
};

  const deleteFlashcard = async (cardOrTerm) => {
  if (!confirm("Delete this flashcard?")) return;
  try {
    // Accept either a card object or a term string
    if (typeof cardOrTerm === "string") {
      // If you’re in a lesson, use that lesson id; else delete global cards by term
      await api.deleteFlashcard({ term: cardOrTerm, lesson_id: selectedLesson?.id ?? null });
      setFlashcards((prev) =>
        prev.filter((c) => !(c.term === cardOrTerm && (selectedLesson ? c.lessonId === selectedLesson.id : true)))
      );
      // Also remove from current lesson dict in memory
      if (selectedLesson?.id) {
        setLessons(prev => prev.map(l =>
          l.id !== selectedLesson.id
            ? l
            : { ...l, dict: Object.fromEntries(Object.entries(l.dict || {}).filter(([t]) => t !== cardOrTerm)) }
        ));
      }
    } else {
      // card object with id/lessonId
      await api.deleteFlashcard({ id: cardOrTerm.id, lesson_id: cardOrTerm.lessonId ?? null, term: cardOrTerm.term });
      setFlashcards((prev) => prev.filter((c) => c.id !== cardOrTerm.id));
      if (cardOrTerm.lessonId) {
        setLessons(prev => prev.map(l =>
          l.id !== cardOrTerm.lessonId
            ? l
            : { ...l, dict: Object.fromEntries(Object.entries(l.dict || {}).filter(([t]) => t !== cardOrTerm.term)) }
        ));
      }
    }
  } catch (e) {
    alert(`Failed to delete flashcard: ${e.message}`);
  }
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

        {loading && <div className="text-gray-600">Loading…</div>}
        {err && <div className="text-red-600">Error: {err}</div>}

        {!loading && !err && route === "home" && (
          <Home
            onCreateLesson={() => { setSelectedLesson(null); setRoute("create"); }}
            onOpenFlashcards={() => setRoute("flashcards")}
            lessons={lessons}
            onOpenLesson={openLesson}
            onDeleteLesson={deleteLesson}
          />
        )}

        {!loading && !err && route === "create" && (
          <CreateLesson
            initialLesson={selectedLesson}
            onBack={() => setRoute("home")}
            onSavedLesson={saveLesson}
            onAddFlashcard={addFlashcard}
          />
        )}

        {!loading && !err && route === "flashcards" && (
          <Flashcards
            cards={flashcards}
            onBack={() => setRoute("home")}
            onDeleteCard={(c) => deleteFlashcard(c.id ? { id: c.id } : c.term)}
          />
        )}
      </div>
    </div>
  );
}
