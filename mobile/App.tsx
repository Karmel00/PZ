import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const API = "http://10.0.2.2:8000";

type Note = {
  id: number;
  localId: string;
  title: string;
  content: string;
  is_deleted: boolean;
  dirty?: boolean;
};

async function getNotes(): Promise<Note[]> {
  return JSON.parse((await AsyncStorage.getItem("notes")) || "[]");
}

async function saveNotes(notes: Note[]) {
  await AsyncStorage.setItem("notes", JSON.stringify(notes));
}

export default function App() {
  const [screen, setScreen] = useState<"login" | "list" | "edit">("login");
  const [notes, setNotes] = useState<Note[]>([]);
  const [edit, setEdit] = useState<Note | null>(null);
  const [email, setEmail] = useState("student@example.com");
  const [password, setPassword] = useState("password123");
  const [token, setToken] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("token").then((saved) => {
      if (saved) {
        setToken(saved);
        setScreen("list");
        sync(saved);
      }
    });
  }, []);

  async function sync(currentToken = token) {
    const local = await getNotes();
    setNotes(local.filter((note) => !note.is_deleted));

    for (const note of local.filter((item) => item.dirty)) {
      await fetch(note.id > 0 ? `${API}/notes/${note.id}` : `${API}/notes`, {
        method: note.id > 0 ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          title: note.title,
          content: note.content,
          is_deleted: note.is_deleted
        })
      });
    }

    const response = await fetch(`${API}/notes`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const remote = (await response.json()).map((note: Note) => ({
      ...note,
      localId: String(note.id),
      dirty: false
    }));
    await saveNotes(remote);
    setNotes(remote.filter((note: Note) => !note.is_deleted));
  }

  async function login() {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    await AsyncStorage.setItem("token", data.access_token);
    setToken(data.access_token);
    setScreen("list");
    sync(data.access_token).catch(() => undefined);
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
    setScreen("edit");
  }

  async function save() {
    if (!edit) return;
    const next = [{ ...edit, dirty: true }, ...notes.filter((note) => note.localId !== edit.localId)];
    await saveNotes(next);
    setNotes(next.filter((note) => !note.is_deleted));
    setScreen("list");
    sync().catch(() => undefined);
  }

  async function remove() {
    if (!edit) return;
    const next = [{ ...edit, is_deleted: true, dirty: true }, ...notes.filter((note) => note.localId !== edit.localId)];
    await saveNotes(next);
    setNotes(next.filter((note) => !note.is_deleted));
    setScreen("list");
    sync().catch(() => undefined);
  }

  async function remind() {
    await Notifications.requestPermissionsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: "NoteSync", body: edit?.title || "Przypomnienie o notatce" },
      trigger: { seconds: 60 }
    });
  }

  if (screen === "login") {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>NoteSync</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="hasło" secureTextEntry />
        <Pressable style={styles.button} onPress={login}><Text style={styles.buttonText}>Zaloguj</Text></Pressable>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (screen === "edit" && edit) {
    return (
      <View style={styles.page}>
        <TextInput style={styles.input} value={edit.title} onChangeText={(title) => setEdit({ ...edit, title })} placeholder="tytuł" />
        <TextInput style={styles.textarea} value={edit.content} onChangeText={(content) => setEdit({ ...edit, content })} placeholder="treść" multiline />
        <Pressable style={styles.button} onPress={save}><Text style={styles.buttonText}>Zapisz</Text></Pressable>
        <Pressable style={styles.button} onPress={remind}><Text style={styles.buttonText}>Przypomnij za 1 min</Text></Pressable>
        <Pressable style={styles.danger} onPress={remove}><Text style={styles.buttonText}>Usuń</Text></Pressable>
        <Pressable style={styles.button} onPress={() => setScreen("list")}><Text style={styles.buttonText}>Wróć</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Notatki</Text>
      <Pressable style={styles.button} onPress={newNote}><Text style={styles.buttonText}>Dodaj</Text></Pressable>
      <Pressable style={styles.button} onPress={() => sync()}><Text style={styles.buttonText}>Synchronizuj</Text></Pressable>
      <FlatList
        data={notes}
        keyExtractor={(note) => note.localId}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => { setEdit(item); setScreen("edit"); }}>
            <Text style={styles.noteTitle}>{item.title}</Text>
            <Text>{item.content}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, gap: 12, padding: 20, backgroundColor: "#f8fafc" },
  title: { fontSize: 28, fontWeight: "bold", color: "#0f172a", marginTop: 40 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, padding: 12, backgroundColor: "white" },
  textarea: { minHeight: 200, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, padding: 12, backgroundColor: "white" },
  button: { backgroundColor: "#2563eb", padding: 12, borderRadius: 6 },
  danger: { backgroundColor: "#ef4444", padding: 12, borderRadius: 6 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "bold" },
  card: { backgroundColor: "white", padding: 12, borderRadius: 6, borderWidth: 1, borderColor: "#e2e8f0", marginTop: 10 },
  noteTitle: { fontWeight: "bold", fontSize: 18 }
});
