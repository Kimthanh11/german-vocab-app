export const api = {
  async listLessons() { const r = await fetch(`/api/lessons`); return r.json(); },
  async saveLesson(lesson) {
    const r = await fetch(`/api/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lesson),
    });
    return r.json();
  },
  async deleteLesson(id) {
    await fetch(`/api/lessons`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  },

  async listFlashcards() { const r = await fetch(`/api/flashcards`); return r.json(); },
  async addFlashcard(card) {
    const r = await fetch(`/api/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
    return r.json();
  },
  async deleteFlashcard(by) {
    await fetch(`/api/flashcards`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(by), // { id } or { term }
    });
  },

  // NEW: counts
  async getCounts() {
    const r = await fetch(`/api/debug`);
    return r.json(); // { lessons, cards }
  },
};
