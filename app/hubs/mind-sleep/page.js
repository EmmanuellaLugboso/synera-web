"use client";

import Link from "next/link";
import "../hub.css";
import "./mind-sleep.css";
import { useOnboarding } from "../../context/OnboardingContext";
import { useMemo, useState } from "react";

/* ---------------- Utilities ---------------- */

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function clampNumber(v) {
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}
function fmtDuration(mins) {
  const m = clampNumber(mins);
  if (!m) return "--";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}m`;
  return `${h}h ${r}m`;
}
function minutesBetweenTimes(bedTime, wakeTime) {
  if (!bedTime || !wakeTime) return 0;
  const [bh, bm] = bedTime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  if ([bh, bm, wh, wm].some((x) => Number.isNaN(x))) return 0;

  const bedM = bh * 60 + bm;
  const wakeM = wh * 60 + wm;
  if (wakeM >= bedM) return wakeM - bedM;
  return wakeM + 24 * 60 - bedM;
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function monthLabel(year, monthIndex) {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}
function isoFromDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const daysInMonth = last.getDate();

  // Monday start (0..6) where 0=Mon, 6=Sun
  const jsDay = first.getDay(); // 0=Sun..6=Sat
  const startOffset = (jsDay + 6) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* -------- PIN Hashing (Web Crypto) -------- */

async function sha256Hex(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- Options ---------------- */

const sleepQualityOptions = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Meh" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
];

const templates = [
  {
    id: "gratitude",
    label: "Gratitude (3 prompts)",
    title: "Gratitude",
    body:
      "1) Today I’m grateful for…\n\n2) One small win I can admit…\n\n3) Something I’m looking forward to…\n\nExtra: What can I do to make tomorrow 5% easier?",
    tags: ["gratitude", "reset"],
  },
  {
    id: "braindump",
    label: "Brain dump (clear the head)",
    title: "Brain dump",
    body:
      "Dump everything here — no structure.\n\n• What’s looping in my head:\n\n• What I’m avoiding:\n\n• What I actually need:\n\nEnd with: One next action I can do in 5 minutes is…",
    tags: ["brain-dump"],
  },
  {
    id: "cbt",
    label: "CBT Thought Record",
    title: "Thought record",
    body:
      "Situation (what happened?):\n\nAutomatic thoughts (what went through my mind?):\n\nEmotions (0–10 intensity):\n\nEvidence FOR the thought:\n\nEvidence AGAINST the thought:\n\nBalanced alternative thought:\n\nAction I’ll take / coping response:\n",
    tags: ["cbt", "thoughts"],
  },
];

/* ---------------- Components ---------------- */

function ScorePicker({ value, onChange, max = 10 }) {
  const items = [];
  for (let i = 0; i <= max; i++) items.push(i);
  return (
    <div className="ms3-scoregrid" role="group">
      {items.map((n) => (
        <button
          key={n}
          type="button"
          className={`ms3-scorebtn ${value === n ? "active" : ""}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function downloadFile(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- Page ---------------- */

export default function Page() {
  const { data, updateMany } = useOnboarding();
  const date = todayISO();

  const [tab, setTab] = useState("journal"); // journal | checkin | sleep | insights

  /* ---------- Storage ---------- */
  const journalEntries = useMemo(
    () => (Array.isArray(data.journalEntries) ? data.journalEntries : []),
    [data.journalEntries]
  );
  const mindLogs = useMemo(
    () => (Array.isArray(data.mindLogs) ? data.mindLogs : []),
    [data.mindLogs]
  );
  const sleepLogs = useMemo(
    () => (Array.isArray(data.sleepLogs) ? data.sleepLogs : []),
    [data.sleepLogs]
  );
  const journalFolders = useMemo(() => {
    const base = Array.isArray(data.journalFolders) ? data.journalFolders : [];
    const uniq = Array.from(new Set(["Inbox", ...base.map((x) => String(x).trim()).filter(Boolean)]));
    return uniq;
  }, [data.journalFolders]);

  /* ---------- Journal Lock (PIN) ---------- */
  const hasPin = !!data.journalPinHash;
  const [locked, setLocked] = useState(!!data.journalLocked && hasPin);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState("unlock"); // setup | unlock | change | disable
  const [pinInput, setPinInput] = useState("");
  const [pinInput2, setPinInput2] = useState("");
  const [pinErr, setPinErr] = useState("");

  function openPinModal(mode) {
    setPinMode(mode);
    setPinInput("");
    setPinInput2("");
    setPinErr("");
    setPinModalOpen(true);
  }

  async function handlePinConfirm() {
    setPinErr("");

    const pin = pinInput.trim();
    const pin2 = pinInput2.trim();

    if (pin.length < 4) {
      setPinErr("PIN must be at least 4 digits/characters.");
      return;
    }

    if (pinMode === "setup") {
      if (pin !== pin2) {
        setPinErr("PINs don’t match.");
        return;
      }
      const hash = await sha256Hex(pin);
      updateMany({ journalPinHash: hash, journalLocked: true });
      setLocked(true);
      setPinModalOpen(false);
      return;
    }

    if (pinMode === "unlock") {
      const hash = await sha256Hex(pin);
      if (hash !== data.journalPinHash) {
        setPinErr("Wrong PIN.");
        return;
      }
      updateMany({ journalLocked: false });
      setLocked(false);
      setPinModalOpen(false);
      return;
    }

    if (pinMode === "change") {
      // pinInput = old, pinInput2 = new in this mode
      const oldPin = pinInput.trim();
      const newPin = pinInput2.trim();

      if (newPin.length < 4) {
        setPinErr("New PIN must be at least 4 digits/characters.");
        return;
      }
      const oldHash = await sha256Hex(oldPin);
      if (oldHash !== data.journalPinHash) {
        setPinErr("Old PIN is wrong.");
        return;
      }
      const newHash = await sha256Hex(newPin);
      updateMany({ journalPinHash: newHash, journalLocked: true });
      setLocked(true);
      setPinModalOpen(false);
      return;
    }

    if (pinMode === "disable") {
      const hash = await sha256Hex(pin);
      if (hash !== data.journalPinHash) {
        setPinErr("Wrong PIN.");
        return;
      }
      updateMany({ journalPinHash: "", journalLocked: false });
      setLocked(false);
      setPinModalOpen(false);
      return;
    }
  }

  /* ---------- Folders ---------- */
  const [folderFilter, setFolderFilter] = useState("All");
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  function addFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    if (name.toLowerCase() === "inbox") return;

    const current = Array.isArray(data.journalFolders) ? data.journalFolders : [];
    const exists = current.some((x) => String(x).toLowerCase() === name.toLowerCase());
    if (exists) {
      setNewFolderName("");
      return;
    }
    updateMany({ journalFolders: [...current, name] });
    setNewFolderName("");
  }

  function removeFolder(name) {
    if (name === "Inbox") return;
    const current = Array.isArray(data.journalFolders) ? data.journalFolders : [];
    const next = current.filter((x) => String(x).toLowerCase() !== String(name).toLowerCase());

    // Move entries from removed folder back to Inbox
    const moved = journalEntries.map((e) =>
      (e.folder || "Inbox").toLowerCase() === String(name).toLowerCase()
        ? { ...e, folder: "Inbox", updatedAt: Date.now() }
        : e
    );

    updateMany({ journalFolders: next, journalEntries: moved });
    if (folderFilter === name) setFolderFilter("All");
  }

  /* ---------- Journal CRUD + search ---------- */
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [jFolder, setJFolder] = useState("Inbox");
  const [jTitle, setJTitle] = useState("");
  const [jBody, setJBody] = useState("");
  const [jMood, setJMood] = useState(7);
  const [jAnxiety, setJAnxiety] = useState(3);
  const [jStress, setJStress] = useState(4);
  const [jTags, setJTags] = useState([]);
  const [jTagInput, setJTagInput] = useState("");
  const [jPinned, setJPinned] = useState(false);

  const filteredJournal = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = journalEntries.slice().sort((a, b) => {
      const ap = a?.pinned ? 1 : 0;
      const bp = b?.pinned ? 1 : 0;
      if (bp !== ap) return bp - ap;
      return (b?.updatedAt || b?.createdAt || 0) - (a?.updatedAt || a?.createdAt || 0);
    });

    if (folderFilter !== "All") {
      list = list.filter((e) => (e.folder || "Inbox") === folderFilter);
    }

    if (!q) return list;

    return list.filter((e) => {
      const title = (e?.title || "").toLowerCase();
      const body = (e?.body || "").toLowerCase();
      const tags = Array.isArray(e?.tags) ? e.tags.join(" ").toLowerCase() : "";
      return title.includes(q) || body.includes(q) || tags.includes(q);
    });
  }, [journalEntries, search, folderFilter]);

  function resetEditor() {
    setEditId(null);
    setJFolder(folderFilter !== "All" ? folderFilter : "Inbox");
    setJTitle("");
    setJBody("");
    setJMood(7);
    setJAnxiety(3);
    setJStress(4);
    setJTags([]);
    setJTagInput("");
    setJPinned(false);
  }

  function openNewEntry() {
    resetEditor();
    setEditorOpen(true);
  }

  function openEditEntry(entry) {
    setEditId(entry.id);
    setJFolder(entry.folder || "Inbox");
    setJTitle(entry.title || "");
    setJBody(entry.body || "");
    setJMood(clampNumber(entry.mood));
    setJAnxiety(clampNumber(entry.anxiety));
    setJStress(clampNumber(entry.stress));
    setJTags(Array.isArray(entry.tags) ? entry.tags : []);
    setJTagInput("");
    setJPinned(!!entry.pinned);
    setEditorOpen(true);
  }

  function addTag() {
    const t = jTagInput.trim();
    if (!t) return;
    const exists = jTags.some((x) => x.toLowerCase() === t.toLowerCase());
    if (exists) {
      setJTagInput("");
      return;
    }
    setJTags((prev) => [...prev, t]);
    setJTagInput("");
  }

  function removeTag(t) {
    setJTags((prev) => prev.filter((x) => x !== t));
  }

  function saveEntry() {
    const body = jBody.trim();
    if (!body) return;

    const payload = {
      id: editId || uid(),
      date,
      folder: jFolder || "Inbox",
      title: (jTitle.trim() || "Untitled entry"),
      body,
      mood: clampNumber(jMood),
      anxiety: clampNumber(jAnxiety),
      stress: clampNumber(jStress),
      tags: jTags,
      pinned: !!jPinned,
      createdAt: editId
        ? (journalEntries.find((x) => x.id === editId)?.createdAt || Date.now())
        : Date.now(),
      updatedAt: Date.now(),
    };

    const next = editId
      ? journalEntries.map((x) => (x.id === editId ? payload : x))
      : [...journalEntries, payload];

    updateMany({ journalEntries: next });
    setEditorOpen(false);
    resetEditor();
  }

  function deleteEntry(id) {
    updateMany({ journalEntries: journalEntries.filter((x) => x.id !== id) });
  }

  function togglePin(id) {
    const next = journalEntries.map((x) =>
      x.id === id ? { ...x, pinned: !x.pinned, updatedAt: Date.now() } : x
    );
    updateMany({ journalEntries: next });
  }

  /* ---------- Templates ---------- */
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  function applyTemplate(t) {
    setJTitle(t.title);
    setJBody(t.body);
    setJTags((prev) => {
      const merged = [...prev];
      for (const tag of t.tags) {
        if (!merged.some((x) => x.toLowerCase() === tag.toLowerCase())) merged.push(tag);
      }
      return merged;
    });
    setTemplateModalOpen(false);
  }

  /* ---------- Export ---------- */
  const [exportOpen, setExportOpen] = useState(false);

  function exportAsJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      entries: filteredJournal,
    };
    downloadFile("journal-export.json", "application/json", JSON.stringify(payload, null, 2));
  }

  function exportAsTXT() {
    const lines = [];
    lines.push(`Journal export — ${new Date().toLocaleString()}`);
    lines.push(`Entries: ${filteredJournal.length}`);
    lines.push("--------------------------------------------------");

    for (const e of filteredJournal) {
      lines.push(`DATE: ${e.date}`);
      lines.push(`FOLDER: ${e.folder || "Inbox"}`);
      lines.push(`TITLE: ${e.title || "Untitled entry"}`);
      lines.push(`MOOD: ${e.mood}/10  ANXIETY: ${e.anxiety}/10  STRESS: ${e.stress}/10`);
      if (e.tags?.length) lines.push(`TAGS: ${e.tags.join(", ")}`);
      lines.push("");
      lines.push(e.body || "");
      lines.push("--------------------------------------------------");
    }

    downloadFile("journal-export.txt", "text/plain", lines.join("\n"));
  }

  function exportAsPDF() {
    // Seamless + no deps: open printable HTML => user “Save as PDF”
    const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Journal Export</title>
<style>
  body{ font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial; padding: 24px; color:#111; }
  h1{ margin:0 0 6px; }
  .meta{ color:#555; margin-bottom: 18px; }
  .entry{ border:1px solid #eee; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
  .top{ display:flex; justify-content:space-between; gap: 10px; flex-wrap:wrap; }
  .title{ font-weight: 800; font-size: 16px; }
  .sub{ color:#666; font-size: 12px; margin-top: 6px; }
  pre{ white-space: pre-wrap; font-family: inherit; line-height: 1.4; margin-top: 10px; }
</style>
</head>
<body>
  <h1>Journal Export</h1>
  <div class="meta">Exported: ${new Date().toLocaleString()} • Entries: ${filteredJournal.length}</div>
  ${filteredJournal
    .map(
      (e) => `
      <div class="entry">
        <div class="top">
          <div class="title">${(e.title || "Untitled entry").replaceAll("<", "&lt;")}</div>
          <div>${e.date}</div>
        </div>
        <div class="sub">
          Folder: ${(e.folder || "Inbox").replaceAll("<", "&lt;")}
          • Mood ${e.mood}/10 • Anxiety ${e.anxiety}/10 • Stress ${e.stress}/10
          ${e.tags?.length ? ` • Tags: ${e.tags.join(", ").replaceAll("<", "&lt;")}` : ""}
        </div>
        <pre>${(e.body || "").replaceAll("<", "&lt;")}</pre>
      </div>
    `
    )
    .join("")}
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  /* ---------- Check-in ---------- */
  const [mood, setMood] = useState(7);
  const [anxiety, setAnxiety] = useState(3);
  const [stress, setStress] = useState(4);
  const [mindNote, setMindNote] = useState("");
  const [mindTags, setMindTags] = useState([]);
  const [mindTagInput, setMindTagInput] = useState("");

  function addMindTag() {
    const t = mindTagInput.trim();
    if (!t) return;
    const exists = mindTags.some((x) => x.toLowerCase() === t.toLowerCase());
    if (exists) {
      setMindTagInput("");
      return;
    }
    setMindTags((prev) => [...prev, t]);
    setMindTagInput("");
  }
  function removeMindTag(t) {
    setMindTags((prev) => prev.filter((x) => x !== t));
  }
  function saveCheckIn() {
    const entry = {
      id: uid(),
      date,
      mood: clampNumber(mood),
      anxiety: clampNumber(anxiety),
      stress: clampNumber(stress),
      tags: mindTags,
      note: mindNote.trim(),
      createdAt: Date.now(),
    };
    updateMany({ mindLogs: [...mindLogs, entry] });
    setMindNote("");
    setMindTags([]);
    setMindTagInput("");
  }
  function deleteMind(id) {
    updateMany({ mindLogs: mindLogs.filter((x) => x.id !== id) });
  }
  const todaysMind = useMemo(() => mindLogs.filter((x) => x?.date === date), [mindLogs, date]);

  /* ---------- Sleep ---------- */
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [quality, setQuality] = useState(3);
  const [wakes, setWakes] = useState("0");
  const [caffeineLate, setCaffeineLate] = useState(false);
  const [screensLate, setScreensLate] = useState(false);
  const [sleepNote, setSleepNote] = useState("");

  const durationPreview = useMemo(
    () => minutesBetweenTimes(bedTime, wakeTime),
    [bedTime, wakeTime]
  );

  function saveSleep() {
    if (!bedTime || !wakeTime) return;
    const entry = {
      id: uid(),
      date,
      bedTime,
      wakeTime,
      durationMins: durationPreview,
      quality: clampNumber(quality),
      wakes: clampNumber(wakes),
      caffeineLate: !!caffeineLate,
      screensLate: !!screensLate,
      note: sleepNote.trim(),
      createdAt: Date.now(),
    };
    updateMany({ sleepLogs: [...sleepLogs, entry] });
    setBedTime("");
    setWakeTime("");
    setQuality(3);
    setWakes("0");
    setCaffeineLate(false);
    setScreensLate(false);
    setSleepNote("");
  }
  function deleteSleep(id) {
    updateMany({ sleepLogs: sleepLogs.filter((x) => x.id !== id) });
  }

  /* ---------- Insights ---------- */
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState(todayISO());

  const calCells = useMemo(() => buildMonthGrid(calYear, calMonth), [calYear, calMonth]);

  const daySummary = useMemo(() => {
    const day = selectedDay;
    const dayM = mindLogs.filter((x) => x.date === day);
    const dayS = sleepLogs.filter((x) => x.date === day);
    const dayJ = journalEntries.filter((x) => x.date === day);

    const avg = (arr, key) => {
      if (!arr.length) return 0;
      let sum = 0;
      for (const a of arr) sum += clampNumber(a?.[key]);
      return Math.round((sum / arr.length) * 10) / 10;
    };

    return {
      mindCount: dayM.length,
      moodAvg: avg(dayM, "mood"),
      anxietyAvg: avg(dayM, "anxiety"),
      stressAvg: avg(dayM, "stress"),
      sleepCount: dayS.length,
      sleepAvgMins: dayS.length ? Math.round(dayS.reduce((s, x) => s + clampNumber(x.durationMins), 0) / dayS.length) : 0,
      sleepQualAvg: avg(dayS, "quality"),
      journalCount: dayJ.length,
    };
  }, [selectedDay, mindLogs, sleepLogs, journalEntries]);

  const dayDots = useMemo(() => {
    // returns { [iso]: { moodLevel, hasSleep, hasJournal } }
    const map = {};
    for (const m of mindLogs) {
      if (!m?.date) continue;
      const iso = m.date;
      const mood = clampNumber(m.mood);
      if (!map[iso]) map[iso] = { moodLevel: 0, hasSleep: false, hasJournal: false };
      // keep max mood for “dot intensity”
      map[iso].moodLevel = Math.max(map[iso].moodLevel, mood);
    }
    for (const s of sleepLogs) {
      if (!s?.date) continue;
      const iso = s.date;
      if (!map[iso]) map[iso] = { moodLevel: 0, hasSleep: false, hasJournal: false };
      map[iso].hasSleep = true;
    }
    for (const j of journalEntries) {
      if (!j?.date) continue;
      const iso = j.date;
      if (!map[iso]) map[iso] = { moodLevel: 0, hasSleep: false, hasJournal: false };
      map[iso].hasJournal = true;
    }
    return map;
  }, [mindLogs, sleepLogs, journalEntries]);

  function dotClassFromMood(mood0to10) {
    const m = clampNumber(mood0to10);
    if (m >= 7) return "on";
    if (m >= 4) return "mid";
    if (m > 0) return "low";
    return "";
  }

  /* ---------- Render guards ---------- */
  const journalLockedActive = locked && hasPin;

  return (
    <div className="hub-page">
      <div className="hub-topbar">
        <Link href="/dashboard" className="back-link">
          ← Back
        </Link>
      </div>

      <div className="hub-hero">
        <div>
          <h1 className="hub-title">
            Mind & Sleep <span className="hub-emoji">🫧</span>
          </h1>
          <p className="hub-sub">Journal + check-ins + sleep + patterns. Clean. Adult. Useful.</p>
        </div>

        <div className="hub-badge">
          <div className="hub-badge-label">Today</div>
          <div className="hub-badge-value">{date}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ms3-tabs">
        <button className={`ms3-tab ${tab === "journal" ? "active" : ""}`} onClick={() => setTab("journal")} type="button">
          Journal
        </button>
        <button className={`ms3-tab ${tab === "checkin" ? "active" : ""}`} onClick={() => setTab("checkin")} type="button">
          Check-in
        </button>
        <button className={`ms3-tab ${tab === "sleep" ? "active" : ""}`} onClick={() => setTab("sleep")} type="button">
          Sleep
        </button>
        <button className={`ms3-tab ${tab === "insights" ? "active" : ""}`} onClick={() => setTab("insights")} type="button">
          Calendar
        </button>
      </div>

      {/* ---------------- JOURNAL ---------------- */}
      {tab === "journal" && (
        <>
          <div className="hub-section hub-section-white">
            <div className="ms3-toprow">
              <div>
                <div className="hub-section-title">Journal</div>
                <div className="hub-section-sub">Folders, templates, lock, export — proper journal vibes.</div>
              </div>

              <div className="ms3-right">
                {!hasPin ? (
                  <button className="ms3-exportBtn" type="button" onClick={() => openPinModal("setup")}>
                    🔒 Set PIN
                  </button>
                ) : (
                  <>
                    {journalLockedActive ? (
                      <button className="ms3-exportBtn" type="button" onClick={() => openPinModal("unlock")}>
                        🔓 Unlock
                      </button>
                    ) : (
                      <button
                        className="ms3-exportBtn"
                        type="button"
                        onClick={() => {
                          updateMany({ journalLocked: true });
                          setLocked(true);
                        }}
                      >
                        🔒 Lock
                      </button>
                    )}

                    <button className="ms3-exportBtn" type="button" onClick={() => openPinModal("change")}>
                      🔁 Change PIN
                    </button>

                    <button className="ms3-exportBtn" type="button" onClick={() => openPinModal("disable")}>
                      🗑 Disable PIN
                    </button>
                  </>
                )}

                <button className="ms3-exportBtn" type="button" onClick={() => setFolderModalOpen(true)}>
                  📁 Folders
                </button>

                <button className="ms3-primary" type="button" onClick={() => setEditorOpen(true) || openNewEntry()}>
                  + New entry
                </button>
              </div>
            </div>

            {/* Locked view */}
            {journalLockedActive ? (
              <div className="ms3-card" style={{ marginTop: 12 }}>
                <div className="ms3-title">Journal locked</div>
                <div className="ms3-sub">Unlock with your PIN to view, edit, or export entries.</div>
                <div className="ms3-exportRow">
                  <button className="ms3-primary" type="button" onClick={() => openPinModal("unlock")}>
                    Unlock journal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="ms3-row" style={{ marginTop: 12 }}>
                  <input
                    className="ms3-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search entries by title, text, or tags…"
                  />

                  <select className="ms3-select" value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}>
                    <option value="All">All folders</option>
                    {journalFolders.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>

                  <button className="ms3-exportBtn" type="button" onClick={() => setTemplateModalOpen(true)}>
                    ✨ Templates
                  </button>

                  <button className="ms3-exportBtn" type="button" onClick={() => setExportOpen(true)}>
                    ⬇ Export
                  </button>
                </div>

                {filteredJournal.length === 0 ? (
                  <div className="fit2-mutedbox" style={{ marginTop: 12 }}>
                    No entries found. Try a template if your brain is blank.
                  </div>
                ) : (
                  <div className="ms3-list">
                    {filteredJournal.slice(0, 40).map((e) => (
                      <div key={e.id} className="ms3-item">
                        <button className="ms3-itemMain" type="button" onClick={() => openEditEntry(e)}>
                          <div className="ms3-title">
                            {e.title || "Untitled entry"}
                            {e.pinned ? <span className="ms3-badge">Pinned</span> : null}
                            {e.folder ? <span className="ms3-badge">{e.folder}</span> : null}
                          </div>
                          <div className="ms3-sub">
                            {e.date} • Mood {e.mood}/10 • Anxiety {e.anxiety}/10 • Stress {e.stress}/10
                            {e.tags?.length ? ` • ${e.tags.join(", ")}` : ""}
                          </div>
                          <div className="ms3-preview">
                            {(e.body || "").slice(0, 160)}
                            {(e.body || "").length > 160 ? "…" : ""}
                          </div>
                        </button>

                        <div className="ms3-actions">
                          <button className="ms3-iconbtn" type="button" onClick={() => togglePin(e.id)} title="Pin">
                            {e.pinned ? "📌" : "📍"}
                          </button>
                          <button className="ms3-iconbtn danger" type="button" onClick={() => deleteEntry(e.id)} title="Delete">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Editor Modal */}
          {editorOpen && !journalLockedActive && (
            <div className="ms3-modal" onMouseDown={() => setEditorOpen(false)}>
              <div className="ms3-modalCard" onMouseDown={(e) => e.stopPropagation()}>
                <div className="ms3-modalTop">
                  <div className="ms3-modalTitle">{editId ? "Edit entry" : "New entry"}</div>
                  <button className="ms3-iconbtn" type="button" onClick={() => setEditorOpen(false)} title="Close">
                    ✕
                  </button>
                </div>

                <div className="ms3-row">
                  <div className="ms3-chip">Folder</div>
                  <select className="ms3-select" value={jFolder} onChange={(e) => setJFolder(e.target.value)}>
                    {journalFolders.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>

                  <button className={`ms3-exportBtn ${jPinned ? "" : ""}`} type="button" onClick={() => setJPinned((p) => !p)}>
                    {jPinned ? "📌 Pinned" : "📍 Pin"}
                  </button>

                  <button className="ms3-exportBtn" type="button" onClick={() => setTemplateModalOpen(true)}>
                    ✨ Templates
                  </button>
                </div>

                <input className="ms3-input" value={jTitle} onChange={(e) => setJTitle(e.target.value)} placeholder="Title (optional)..." />
                <textarea className="ms3-textarea" value={jBody} onChange={(e) => setJBody(e.target.value)} placeholder="Write here…" />

                <div className="ms3-grid2">
                  <div className="ms3-card" style={{ marginTop: 0 }}>
                    <div className="ms3-row" style={{ justifyContent: "space-between" }}>
                      <div className="ms3-title">Mood</div>
                      <span className="ms3-chip">{jMood}/10</span>
                    </div>
                    <ScorePicker value={jMood} onChange={setJMood} />
                  </div>

                  <div className="ms3-card" style={{ marginTop: 0 }}>
                    <div className="ms3-row" style={{ justifyContent: "space-between" }}>
                      <div className="ms3-title">Anxiety</div>
                      <span className="ms3-chip">{jAnxiety}/10</span>
                    </div>
                    <ScorePicker value={jAnxiety} onChange={setJAnxiety} />
                  </div>

                  <div className="ms3-card" style={{ marginTop: 0 }}>
                    <div className="ms3-row" style={{ justifyContent: "space-between" }}>
                      <div className="ms3-title">Stress</div>
                      <span className="ms3-chip">{jStress}/10</span>
                    </div>
                    <ScorePicker value={jStress} onChange={setJStress} />
                  </div>

                  <div className="ms3-card" style={{ marginTop: 0 }}>
                    <div className="ms3-title">Tags</div>
                    <div className="ms3-tagrow">
                      <input
                        className="ms3-taginput"
                        value={jTagInput}
                        onChange={(e) => setJTagInput(e.target.value)}
                        placeholder="Add a tag (uni, work, relationships...)"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <button className="mini-btn" type="button" onClick={addTag}>
                        Add tag
                      </button>
                    </div>

                    {jTags.length > 0 && (
                      <div className="ms3-tags">
                        {jTags.map((t) => (
                          <button key={t} className="ms3-tag" type="button" onClick={() => removeTag(t)} title="Remove tag">
                            {t} ✕
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={saveEntry}
                    disabled={!jBody.trim()}
                    style={!jBody.trim() ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                  >
                    Save
                  </button>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => {
                      setEditorOpen(false);
                      resetEditor();
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <div className="ms3-muted" style={{ marginTop: 10 }}>
                  Stored locally in your app’s OnboardingContext (not cloud yet).
                </div>
              </div>
            </div>
          )}

          {/* Templates Modal */}
          {templateModalOpen && !journalLockedActive && (
            <div className="ms3-modal" onMouseDown={() => setTemplateModalOpen(false)}>
              <div className="ms3-modalCard" onMouseDown={(e) => e.stopPropagation()}>
                <div className="ms3-modalTop">
                  <div className="ms3-modalTitle">Templates</div>
                  <button className="ms3-iconbtn" type="button" onClick={() => setTemplateModalOpen(false)} title="Close">
                    ✕
                  </button>
                </div>

                <div className="ms3-sub">Pick one and it will auto-fill your entry.</div>

                <div className="ms3-list">
                  {templates.map((t) => (
                    <div key={t.id} className="ms3-item">
                      <button className="ms3-itemMain" type="button" onClick={() => applyTemplate(t)}>
                        <div className="ms3-title">{t.label}</div>
                        <div className="ms3-sub">Auto adds tags: {t.tags.join(", ")}</div>
                      </button>
                      <div className="ms3-actions">
                        <button className="ms3-iconbtn" type="button" onClick={() => applyTemplate(t)} title="Use">
                          ＋
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Export Modal */}
          {exportOpen && !journalLockedActive && (
            <div className="ms3-modal" onMouseDown={() => setExportOpen(false)}>
              <div className="ms3-modalCard" onMouseDown={(e) => e.stopPropagation()}>
                <div className="ms3-modalTop">
                  <div className="ms3-modalTitle">Export</div>
                  <button className="ms3-iconbtn" type="button" onClick={() => setExportOpen(false)} title="Close">
                    ✕
                  </button>
                </div>

                <div className="ms3-sub">
                  Exports your current filtered view: <strong>{filteredJournal.length}</strong> entries
                  {folderFilter !== "All" ? ` in “${folderFilter}”` : ""}.
                </div>

                <div className="ms3-exportRow">
                  <button className="ms3-exportBtn" type="button" onClick={exportAsTXT}>
                    TXT
                  </button>
                  <button className="ms3-exportBtn" type="button" onClick={exportAsJSON}>
                    JSON
                  </button>
                  <button className="ms3-exportBtn" type="button" onClick={exportAsPDF}>
                    PDF (Print → Save as PDF)
                  </button>
                </div>

                <div className="ms3-muted" style={{ marginTop: 10 }}>
                  PDF export opens a print page. Choose “Save as PDF”.
                </div>
              </div>
            </div>
          )}

          {/* Folders Modal */}
          {folderModalOpen && !journalLockedActive && (
            <div className="ms3-modal" onMouseDown={() => setFolderModalOpen(false)}>
              <div className="ms3-modalCard" onMouseDown={(e) => e.stopPropagation()}>
                <div className="ms3-modalTop">
                  <div className="ms3-modalTitle">Folders</div>
                  <button className="ms3-iconbtn" type="button" onClick={() => setFolderModalOpen(false)} title="Close">
                    ✕
                  </button>
                </div>

                <div className="ms3-sub">Inbox is default and can’t be removed.</div>

                <div className="ms3-tagrow">
                  <input
                    className="ms3-taginput"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFolder();
                      }
                    }}
                  />
                  <button className="mini-btn" type="button" onClick={addFolder}>
                    Add folder
                  </button>
                </div>

                <div className="ms3-list">
                  {journalFolders.map((f) => (
                    <div key={f} className="ms3-item">
                      <div className="ms3-itemMain" style={{ cursor: "default" }}>
                        <div className="ms3-title">{f}</div>
                        <div className="ms3-sub">
                          Entries: {journalEntries.filter((e) => (e.folder || "Inbox") === f).length}
                        </div>
                      </div>

                      <div className="ms3-actions">
                        {f !== "Inbox" ? (
                          <button className="ms3-iconbtn danger" type="button" onClick={() => removeFolder(f)} title="Remove folder">
                            ✕
                          </button>
                        ) : (
                          <button className="ms3-iconbtn" type="button" disabled title="Inbox can’t be removed" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PIN Modal */}
          {pinModalOpen && (
            <div className="ms3-modal" onMouseDown={() => setPinModalOpen(false)}>
              <div className="ms3-modalCard" onMouseDown={(e) => e.stopPropagation()}>
                <div className="ms3-modalTop">
                  <div className="ms3-modalTitle">
                    {pinMode === "setup" && "Set PIN"}
                    {pinMode === "unlock" && "Unlock journal"}
                    {pinMode === "change" && "Change PIN"}
                    {pinMode === "disable" && "Disable PIN"}
                  </div>
                  <button className="ms3-iconbtn" type="button" onClick={() => setPinModalOpen(false)} title="Close">
                    ✕
                  </button>
                </div>

                {pinMode === "setup" && (
                  <>
                    <div className="ms3-sub">Choose a PIN you’ll remember. Minimum 4 characters.</div>
                    <input className="ms3-input" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Enter PIN" />
                    <input className="ms3-input" value={pinInput2} onChange={(e) => setPinInput2(e.target.value)} placeholder="Confirm PIN" />
                  </>
                )}

                {pinMode === "unlock" && (
                  <>
                    <div className="ms3-sub">Enter PIN to unlock.</div>
                    <input className="ms3-input" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Enter PIN" />
                  </>
                )}

                {pinMode === "change" && (
                  <>
                    <div className="ms3-sub">Enter old PIN, then new PIN.</div>
                    <input className="ms3-input" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Old PIN" />
                    <input className="ms3-input" value={pinInput2} onChange={(e) => setPinInput2(e.target.value)} placeholder="New PIN" />
                  </>
                )}

                {pinMode === "disable" && (
                  <>
                    <div className="ms3-sub">Enter PIN to disable lock (not recommended).</div>
                    <input className="ms3-input" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Enter PIN" />
                  </>
                )}

                {pinErr ? <div className="ms3-card" style={{ marginTop: 12, borderColor: "#FFD0E1", background: "#FFF6FA" }}>{pinErr}</div> : null}

                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button className="primary-btn" type="button" onClick={handlePinConfirm}>
                    Confirm
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => setPinModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------------- CHECK-IN ---------------- */}
      {tab === "checkin" && (
        <>
          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Daily Check-in</div>
            <div className="hub-section-sub">{date}</div>

            <div className="ms3-card">
              <div className="ms3-row" style={{ justifyContent: "space-between" }}>
                <div className="ms3-title">Mood</div>
                <span className="ms3-chip">{mood}/10</span>
              </div>
              <ScorePicker value={mood} onChange={setMood} />
            </div>

            <div className="ms3-card">
              <div className="ms3-row" style={{ justifyContent: "space-between" }}>
                <div className="ms3-title">Anxiety</div>
                <span className="ms3-chip">{anxiety}/10</span>
              </div>
              <ScorePicker value={anxiety} onChange={setAnxiety} />
            </div>

            <div className="ms3-card">
              <div className="ms3-row" style={{ justifyContent: "space-between" }}>
                <div className="ms3-title">Stress</div>
                <span className="ms3-chip">{stress}/10</span>
              </div>
              <ScorePicker value={stress} onChange={setStress} />
            </div>

            <div className="ms3-tagrow">
              <input
                className="ms3-taginput"
                value={mindTagInput}
                onChange={(e) => setMindTagInput(e.target.value)}
                placeholder="Add a tag (uni, work, gym...)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMindTag();
                  }
                }}
              />
              <button className="mini-btn" type="button" onClick={addMindTag}>
                Add tag
              </button>
            </div>

            {mindTags.length > 0 && (
              <div className="ms3-tags">
                {mindTags.map((t) => (
                  <button key={t} className="ms3-tag" type="button" onClick={() => removeMindTag(t)} title="Remove tag">
                    {t} ✕
                  </button>
                ))}
              </div>
            )}

            <textarea
              className="ms3-textarea"
              value={mindNote}
              onChange={(e) => setMindNote(e.target.value)}
              placeholder="Optional note… what’s driving it?"
            />

            <div className="btn-row">
              <button className="primary-btn" type="button" onClick={saveCheckIn}>
                Save check-in
              </button>
            </div>
          </div>

          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Today</div>
            <div className="hub-section-sub">Your check-ins for {date}</div>

            {todaysMind.length === 0 ? (
              <div className="fit2-mutedbox" style={{ marginTop: 10 }}>
                No check-ins yet today.
              </div>
            ) : (
              <div className="ms3-list">
                {todaysMind
                  .slice()
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .map((x) => (
                    <div key={x.id} className="ms3-item">
                      <div className="ms3-itemMain" style={{ cursor: "default" }}>
                        <div className="ms3-title">
                          Mood {x.mood}/10 • Anxiety {x.anxiety}/10 • Stress {x.stress}/10
                        </div>
                        <div className="ms3-sub">
                          {x.tags?.length ? x.tags.join(", ") : "No tags"} •{" "}
                          {new Date(x.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {x.note ? <div className="ms3-preview">“{x.note}”</div> : null}
                      </div>

                      <div className="ms3-actions">
                        <button className="ms3-iconbtn danger" type="button" onClick={() => deleteMind(x.id)} title="Delete">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------------- SLEEP ---------------- */}
      {tab === "sleep" && (
        <>
          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Sleep Log</div>
            <div className="hub-section-sub">{date}</div>

            <div className="ms3-grid2" style={{ marginTop: 10 }}>
              <div className="ms3-card" style={{ marginTop: 0 }}>
                <div className="ms3-title">Bedtime</div>
                <input className="ms3-input" type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
              </div>
              <div className="ms3-card" style={{ marginTop: 0 }}>
                <div className="ms3-title">Wake</div>
                <input className="ms3-input" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
              </div>
              <div className="ms3-card" style={{ marginTop: 0 }}>
                <div className="ms3-title">Duration</div>
                <div className="ms3-sub">Auto calculates across midnight</div>
                <div style={{ marginTop: 10, fontWeight: 1100, fontSize: 18 }}>{fmtDuration(durationPreview)}</div>
              </div>
              <div className="ms3-card" style={{ marginTop: 0 }}>
                <div className="ms3-title">Awakenings</div>
                <div className="ms3-sub">How many times you woke up</div>
                <input className="ms3-miniinput" type="number" min="0" value={wakes} onChange={(e) => setWakes(e.target.value)} style={{ marginTop: 10 }} />
              </div>
            </div>

            <div className="ms3-card">
              <div className="ms3-row" style={{ justifyContent: "space-between" }}>
                <div className="ms3-title">Sleep quality</div>
                <span className="ms3-chip">{quality}/5</span>
              </div>

              <div className="ms3-pillrow">
                {sleepQualityOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`ms3-pillbtn ${quality === o.value ? "active" : ""}`}
                    onClick={() => setQuality(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              <div className="ms3-row" style={{ marginTop: 12 }}>
                <button type="button" className={`ms3-toggle ${caffeineLate ? "on" : ""}`} onClick={() => setCaffeineLate((p) => !p)}>
                  ☕ Caffeine late
                </button>
                <button type="button" className={`ms3-toggle ${screensLate ? "on" : ""}`} onClick={() => setScreensLate((p) => !p)}>
                  📱 Screens late
                </button>
              </div>

              <textarea
                className="ms3-textarea"
                value={sleepNote}
                onChange={(e) => setSleepNote(e.target.value)}
                placeholder="Optional note… why was sleep bad/good?"
              />

              <div className="btn-row">
                <button
                  className="primary-btn"
                  type="button"
                  onClick={saveSleep}
                  disabled={!bedTime || !wakeTime}
                  style={!bedTime || !wakeTime ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                >
                  Save sleep
                </button>
              </div>
            </div>
          </div>

          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Recent sleep</div>

            {sleepLogs.length === 0 ? (
              <div className="fit2-mutedbox" style={{ marginTop: 10 }}>
                No sleep logs yet.
              </div>
            ) : (
              <div className="ms3-list">
                {sleepLogs
                  .slice()
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .slice(0, 12)
                  .map((x) => (
                    <div key={x.id} className="ms3-item">
                      <div className="ms3-itemMain" style={{ cursor: "default" }}>
                        <div className="ms3-title">
                          {x.date} • {fmtDuration(x.durationMins)} • {x.quality}/5
                        </div>
                        <div className="ms3-sub">
                          {x.bedTime} → {x.wakeTime}
                          {x.wakes ? ` • wakes: ${x.wakes}` : ""}
                          {x.caffeineLate ? " • caffeine late" : ""}
                          {x.screensLate ? " • screens late" : ""}
                        </div>
                        {x.note ? <div className="ms3-preview">“{x.note}”</div> : null}
                      </div>

                      <div className="ms3-actions">
                        <button className="ms3-iconbtn danger" type="button" onClick={() => deleteSleep(x.id)} title="Delete">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------------- CALENDAR / INSIGHTS ---------------- */}
      {tab === "insights" && (
        <>
          <div className="hub-section hub-section-white">
            <div className="ms3-calHead">
              <div>
                <div className="hub-section-title">Calendar</div>
                <div className="hub-section-sub">Dots show: Mood / Sleep / Journal for each day.</div>
              </div>

              <div className="ms3-calNav">
                <button
                  className="ms3-calBtn"
                  type="button"
                  onClick={() => {
                    const d = new Date(calYear, calMonth, 1);
                    d.setMonth(d.getMonth() - 1);
                    setCalYear(d.getFullYear());
                    setCalMonth(d.getMonth());
                  }}
                  title="Prev month"
                >
                  ←
                </button>

                <div className="ms3-calLabel">{monthLabel(calYear, calMonth)}</div>

                <button
                  className="ms3-calBtn"
                  type="button"
                  onClick={() => {
                    const d = new Date(calYear, calMonth, 1);
                    d.setMonth(d.getMonth() + 1);
                    setCalYear(d.getFullYear());
                    setCalMonth(d.getMonth());
                  }}
                  title="Next month"
                >
                  →
                </button>
              </div>
            </div>

            <div className="ms3-calGrid" style={{ marginTop: 10 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="ms3-calDow">{d}</div>
              ))}

              {calCells.map((d, idx) => {
                if (!d) return <div key={`e_${idx}`} className="ms3-calCell empty" />;

                const iso = isoFromDate(d);
                const dots = dayDots[iso] || { moodLevel: 0, hasSleep: false, hasJournal: false };
                const moodClass = dotClassFromMood(dots.moodLevel);
                const isSelected = iso === selectedDay;

                return (
                  <button
                    key={iso}
                    type="button"
                    className={`ms3-calCell ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedDay(iso)}
                    title={iso}
                  >
                    <div className="ms3-calNum">{d.getDate()}</div>
                    <div className="ms3-dots">
                      <span className={`ms3-dot ${moodClass}`} title="Mood" />
                      <span className={`ms3-dot ${dots.hasSleep ? "on" : ""}`} title="Sleep" />
                      <span className={`ms3-dot ${dots.hasJournal ? "on" : ""}`} title="Journal" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Day summary</div>
            <div className="hub-section-sub">{selectedDay}</div>

            <div className="ms3-grid2" style={{ marginTop: 10 }}>
              <div className="ms3-card" style={{ marginTop: 0 }}>
                <div className="ms3-title">Mind</div>
                <div className="ms3-sub">
                  Check-ins: <strong>{daySummary.mindCount}</strong>
                </div>
                <div className="ms3-sub">
                  Avg Mood: <strong>{daySummary.moodAvg || 0}</strong>/10
                </div>
                <div className="ms3-sub">
                  Avg Anxiety: <strong>{daySummary.anxietyAvg || 0}</strong>/10
                </div>
                <div className="ms3-sub">
                  Avg Stress: <strong>{daySummary.stressAvg || 0}</strong>/10
                </div>
              </div>

              <div className="ms3-card" style={{ marginTop: 0 }}>
                <div className="ms3-title">Sleep</div>
                <div className="ms3-sub">
                  Logs: <strong>{daySummary.sleepCount}</strong>
                </div>
                <div className="ms3-sub">
                  Avg Duration: <strong>{fmtDuration(daySummary.sleepAvgMins)}</strong>
                </div>
                <div className="ms3-sub">
                  Avg Quality: <strong>{daySummary.sleepQualAvg || 0}</strong>/5
                </div>
              </div>

              <div className="ms3-card" style={{ marginTop: 0 }}>
                <div className="ms3-title">Journal</div>
                <div className="ms3-sub">
                  Entries: <strong>{daySummary.journalCount}</strong>
                </div>
                <div className="ms3-sub">Tip: tap Journal tab to search/filter that date.</div>
              </div>

              <div className="ms3-card" style={{ marginTop: 0 }}>
                <div className="ms3-title">Quick actions</div>
                <div className="ms3-exportRow">
                  <button className="ms3-exportBtn" type="button" onClick={() => setTab("checkin")}>
                    Go to check-in
                  </button>
                  <button className="ms3-exportBtn" type="button" onClick={() => setTab("sleep")}>
                    Go to sleep
                  </button>
                  <button
                    className="ms3-exportBtn"
                    type="button"
                    onClick={() => {
                      setTab("journal");
                      if (!journalLockedActive) openNewEntry();
                    }}
                  >
                    New journal entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
