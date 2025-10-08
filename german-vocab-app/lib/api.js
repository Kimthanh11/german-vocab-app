// src/lib/api.js

// Generic, safe fetch → JSON (with timeout + good errors)
async function fetchJSON(url, opts = {}, timeout = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);

  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const ct = res.headers.get("content-type") || "";

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
    }

    if (res.status === 204) return null;

    if (ct.includes("application/json")) {
      return await res.json();
    }

    const text = await res.text();
    try { return text ? JSON.parse(text) : null; } catch { return text; }
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  // LESSONS
  listLessons: () =>
    fetchJSON("/api/lessons"),

  saveLesson: (lesson) =>
    fetchJSON("/api/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lesson),
    }), // → returns saved lesson { id, title, content, dict, ... }

  deleteLesson: (id) =>
    fetchJSON("/api/lessons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }), // → returns null (204 expected)

  // FLASHCARDS
  listFlashcards: () =>
    fetchJSON("/api/flashcards"),

  addFlashcard: (card) =>
    fetchJSON("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card), // { term, meaning, lesson_id? }
    }),

  deleteFlashcard: (by) =>
  fetchJSON("/api/flashcards", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(by), // { id } or { term, lesson_id }
  }),
};
