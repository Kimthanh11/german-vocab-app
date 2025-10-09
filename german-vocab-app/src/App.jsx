// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
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

  // flashcards route-local states
  const [fcLoading, setFcLoading] = useState(false);
  const [fcErr, setFcErr] = useState("");

  // --- initial load (lessons + flashcards) ---
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const [L, C] = await Promise.all([
          api.listLessons(),
          api.listFlashcards(),
        ]);
        setLessons(Array.isArray(L) ? L : []);
        setFlashcards(Array.isArray(C) ? C : []);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- fetch flashcards when route = "flashcards" (avoids race) ---
  useEffect(() => {
    if (route !== "flashcards") return;
    let alive = true;
    (async () => {
      try {
        setFcErr("");
        setFcLoading(true);
        const C = await api.listFlashcards();
        if (!alive) return;
        setFlashcards(Array.isArray(C) ? C : []);
      } catch (e) {
        if (!alive) return;
        setFcErr(e.message || String(e));
      } finally {
        if (alive) setFcLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [route]);

  // --- helpers to revalidate from server ---
  const reloadLessons = async () => {
    try {
      const L = await api.listLessons();
      setLessons(Array.isArray(L) ? L : []);
    } catch (e) {
      console.error("reloadLessons:", e);
    }
  };
  const reloadFlashcards = async () => {
    try {
      setFcLoading(true);
      const C = await api.listFlashcards();
      setFlashcards(Array.isArray(C) ? C : []);
    } catch (e) {
      setFcErr(e.message || String(e));
    } finally {
      setFcLoading(false);
    }
  };

  // --- create/update lesson ---
  const saveLesson = async (lesson) => {
    try {
      const saved = await api.saveLesson(lesson); // { id, ... }
      setLessons((prev) => {
        const idx = prev.findIndex((l) => l.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
      return saved; // allow CreateLesson to capture saved.id
    } catch (e) {
      alert(`Failed to save lesson: ${e.message}`);
      throw e;
    }
  };

  // --- add flashcard (server first, dedupe locally) ---
  const addFlashcard = async (term, meaning, lesson_id, context) => {
    try {
      const saved = await api.addFlashcard({ term, meaning, lesson_id, context });
      setFlashcards((prev) => {
        const exists = prev.some(
          (c) => (saved?.id && c.id === saved.id) || c.term.toLowerCase() === term.toLowerCase()
        );
        return exists ? prev : [saved, ...prev];
      });
      // keep lesson.dict in memory in sync if we’re editing that lesson
      if (lesson_id) {
        setLessons((prev) =>
          prev.map((l) =>
            l.id !== lesson_id ? l : { ...l, dict: { ...(l.dict || {}), [term]: meaning } }
          )
        );
      }
    } catch (e) {
      alert(`Failed to add flashcard: ${e.message}`);
    }
  };

  // --- delete flashcard (optimistic + revalidate) ---
  const deleteFlashcard = async (cardOrTerm) => {
    if (!confirm("Delete this flashcard?")) return;

    const by =
      typeof cardOrTerm === "string"
        ? { term: cardOrTerm, lesson_id: selectedLesson?.id ?? null }
        : { id: cardOrTerm.id, term: cardOrTerm.term, lesson_id: cardOrTerm.lessonId ?? null };

    // optimistic UI
    setFlashcards((prev) =>
      by.id
        ? prev.filter((c) => c.id !== by.id)
        : prev.filter(
            (c) => !(c.term === by.term && (by.lesson_id ? c.lessonId === by.lesson_id : true))
          )
    );

    // also drop from current lesson dict in memory
    if (by.lesson_id) {
      setLessons((prev) =>
        prev.map((l) =>
          l.id !== by.lesson_id
            ? l
            : {
                ...l,
                dict: Object.fromEntries(
                  Object.entries(l.dict || {}).filter(([t]) => t !== by.term)
                ),
              }
        )
      );
    }

    try {
      await api.deleteFlashcard(by); // API returns {ok:true}
    } catch (e) {
      alert(`Failed to delete flashcard: ${e.message}`);
    } finally {
      // revalidate to be 100% consistent
      if (route === "flashcards") await reloadFlashcards();
      if (by.lesson_id) await reloadLessons();
    }
  };

  // --- open / delete lesson ---
  const openLesson = (lesson) => {
    setSelectedLesson(lesson);
    setRoute("create");
  };

  const deleteLesson = async (id) => {
    if (!confirm("Delete this lesson?")) return;

    // optimistic UI
    setLessons((prev) => prev.filter((l) => l.id !== id));
    if (selectedLesson?.id === id) {
      setSelectedLesson(null);
      setRoute("home");
    }

    try {
      await api.deleteLesson(id);
    } catch (e) {
      alert(`Failed to delete lesson: ${e.message}`);
    } finally {
      reloadLessons();
      // flashcards may have cascaded; refresh deck too
      if (route === "flashcards") await reloadFlashcards();
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-3xl p-4">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-indigo-600">Deutsch Lern-App</h1>
          <nav className="flex gap-2">
            <button
              className="px-3 py-2 rounded bg-white shadow"
              onClick={() => {
                setSelectedLesson(null);
                setRoute("home");
              }}
            >
              Home
            </button>
            <button
              className="px-3 py-2 rounded bg-white shadow"
              onClick={() => {
                setSelectedLesson(null);
                setRoute("create");
              }}
            >
              Create
            </button>
            <button
              className="px-3 py-2 rounded bg-white shadow"
              onClick={() => setRoute("flashcards")}
            >
              Flashcards
            </button>
          </nav>
        </header>

        {loading && <div className="text-gray-600">Loading…</div>}
        {err && <div className="text-red-600">Error: {err}</div>}

        {!loading && !err && route === "home" && (
          <Home
            onCreateLesson={() => {
              setSelectedLesson(null);
              setRoute("create");
            }}
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
            loading={fcLoading}
            error={fcErr}
            onBack={() => setRoute("home")}
            onDeleteCard={(c) => deleteFlashcard(c.id ? { id: c.id } : c.term)}
          />
        )}
      </div>
    </div>
  );
}
