import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

type Note = {
  id: number;
  localId: string;
  title: string;
  content: string;
  is_deleted: boolean;
  dirty?: boolean;
};

function loadNotes(): Note[] {
  return JSON.parse(localStorage.getItem("notes") || "[]");
}

function saveNotes(notes: Note[]) {
  localStorage.setItem("notes", JSON.stringify(notes));
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`
  };
}

async function syncNotes() {
  if (!navigator.onLine || !localStorage.getItem("token")) return loadNotes();

  for (const note of loadNotes().filter((item) => item.dirty)) {
    await fetch(note.id > 0 ? `${API}/notes/${note.id}` : `${API}/notes`, {
      method: note.id > 0 ? "PUT" : "POST",
      headers: headers(),
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        is_deleted: note.is_deleted
      })
    });
  }

  const response = await fetch(`${API}/notes`, { headers: headers() });
  const notes = (await response.json()).map((note: Note) => ({
    ...note,
    localId: String(note.id),
    dirty: false
  }));
  saveNotes(notes);
  return notes;
}

export function App() {
  const [view, setView] = useState<"login" | "list" | "edit">(
    localStorage.getItem("token") ? "list" : "login"
  );
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [edit, setEdit] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [username, setUsername] = useState("student");
  const [email, setEmail] = useState("student@example.com");
  const [password, setPassword] = useState("password123");

  useEffect(() => {
    syncNotes().then(setNotes).catch(() => setNotes(loadNotes()));
    window.addEventListener("online", () => syncNotes().then(setNotes));
  }, []);

  async function auth(path: "login" | "register") {
    const body = path === "register" ? { username, email, password } : { email, password };
    const response = await fetch(`${API}/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    setView("list");
    setNotes(await syncNotes());
  }

  function newNote() {
    setEdit({
      id: -Date.now(),
      localId: `local-${Date.now()}`,
      title: "",
      content: "",
      is_deleted: false,
      dirty: true
    });
    setView("edit");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!edit) return;
    const next = [{ ...edit, dirty: true }, ...notes.filter((note) => note.localId !== edit.localId)];
    saveNotes(next);
    setNotes(next);
    setView("list");
    syncNotes().then(setNotes).catch(() => undefined);
  }

  async function remove() {
    if (!edit) return;
    const next = [{ ...edit, is_deleted: true, dirty: true }, ...notes.filter((note) => note.localId !== edit.localId)];
    saveNotes(next);
    setNotes(next.filter((note) => !note.is_deleted));
    setView("list");
    syncNotes().then(setNotes).catch(() => undefined);
  }

  const shown = useMemo(
    () =>
      notes.filter(
        (note) =>
          !note.is_deleted &&
          `${note.title} ${note.content}`.toLowerCase().includes(search.toLowerCase())
      ),
    [notes, search]
  );

  if (view === "login") {
    return (
      <main>
        <h1>NoteSync</h1>
        <input placeholder="login" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="hasło" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={() => auth("login")}>Zaloguj</button>
        <button onClick={() => auth("register")}>Zarejestruj</button>
      </main>
    );
  }

  if (view === "edit" && edit) {
    return (
      <main>
        <form onSubmit={save}>
          <input placeholder="tytuł" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required />
          <textarea placeholder="treść" value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} />
          <button>Zapisz</button>
          <button type="button" onClick={remove}>Usuń</button>
          <button type="button" onClick={() => setView("list")}>Wróć</button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <h1>Notatki</h1>
      <input placeholder="szukaj" value={search} onChange={(e) => setSearch(e.target.value)} />
      <button onClick={newNote}>Dodaj</button>
      <button onClick={() => syncNotes().then(setNotes)}>Synchronizuj</button>
      {shown.map((note) => (
        <article key={note.localId} onClick={() => { setEdit(note); setView("edit"); }}>
          <h2>{note.title}</h2>
          <p>{note.content}</p>
          {note.dirty && <small>offline</small>}
        </article>
      ))}
    </main>
  );
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(<App />);
}
