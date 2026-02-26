import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

const BASE = import.meta.env.BASE_URL;

// ─── Patch notes ────────────────────────────────────────────────────────────
// Dodaj nowy wpis na POCZĄTKU tablicy żeby pojawił się na górze listy.
const PATCH_NOTES = [
  {
    version: "1.3",
    date: "26.02.2026",
    changes: [
      "Dodano licznik wygranych",
      "Dodano informację o pozycji osoby po rozwiązaniu namedle",
    ],
  },
    {
    version: "1.2",
    date: "25.02.2026",
    changes: [
      "Dodano najpopularniejsze ksywki z serwera kropka",
      "Dodano wsparcie dla entera"
    ],
  },
  {
    version: "1.1",
    date: "25.02.2026",
    changes: [
      "Dodano przycisk z patch notesami",
      "Zaaktualizowano dane o osobach",
      "Małe poprawki w kodzie"
    ],
  },
  {
    version: "1.01",
    date: "24.02.2026",
    changes: [
      "Zmiany w danych o osobach",
      "Dodano tekst o przyszłych aktualizacjach",
    ],
  },
  {
    version: "1.0",
    date: "24.02.2026",
    changes: [
      "Pierwsze wydanie Namedle!",
      "Tryb codzienny i nieskończony",
      "19 osób w bazie",
    ],
  },
];

const FRIENDS = [
  {
    name: "axesi",
    image: "/zdjecia/axesi.png",
    skill: "mid",
    wzrost: "niski",
    region: "biedrusko",
    kortyzol: "niski",
    rokUrodzenia: "2010",
  },
  {
    name: "barwice",
    image: "/zdjecia/barwice.png",
    skill: "ass",
    wzrost: "sredni",
    region: "biedrusko",
    kortyzol: "niski",
    rokUrodzenia: "2010",
  },
  {
    name: "bluseq",
    image: "/zdjecia/bluseq.png",
    skill: "mid",
    wzrost: "sredni",
    region: "biedrusko",
    kortyzol: "niski",
    rokUrodzenia: "2010",
  },
  {
    name: "criper",
    image: "/zdjecia/criper.png",
    skill: "ass",
    wzrost: "sredni",
    region: "biedrusko",
    kortyzol: "wysoki",
    rokUrodzenia: "2010",
  },
  {
    name: "czerwony",
    image: "/zdjecia/czerwony.png",
    skill: "goated",
    wzrost: "wysoki",
    region: "poznan",
    kortyzol: "wysoki",
    rokUrodzenia: "2008",
  },
  {
    name: "drbones",
    image: "/zdjecia/drbones.png",
    skill: "goated",
    wzrost: "niski",
    region: "potrzanowo",
    kortyzol: "niski",
    rokUrodzenia: "2008",
  },
  {
    name: "ecclestas",
    image: "/zdjecia/ecclestas.png",
    skill: "goated",
    wzrost: "wysoki",
    region: "poznan",
    kortyzol: "sredni",
    rokUrodzenia: "2007",
  },
  {
    name: "edek",
    image: "/zdjecia/edek.png",
    skill: "goated",
    wzrost: "sredni",
    region: "czestochowa",
    kortyzol: "sredni",
    rokUrodzenia: "2005",
  },
  {
    name: "gierzek",
    image: "/zdjecia/gierzek.png",
    skill: "ass",
    wzrost: "sredni",
    region: "poznan",
    kortyzol: "sredni",
    rokUrodzenia: "2007",
  },
  {
    name: "igorfrost",
    image: "/zdjecia/igorfrost.png",
    skill: "mid",
    wzrost: "wysoki",
    region: "potasze",
    kortyzol: "sredni",
    rokUrodzenia: "2007",
  },
  {
    name: "kasti",
    image: "/zdjecia/kasti.png",
    skill: "goated",
    wzrost: "niski",
    region: "biedrusko",
    kortyzol: "wysoki",
    rokUrodzenia: "2010",
  },
  {
    name: "kebcio",
    image: "/zdjecia/kebcio.png",
    skill: "goated",
    wzrost: "sredni",
    region: "poznan",
    kortyzol: "niski",
    rokUrodzenia: "2007",
  },
  {
    name: "kokos",
    image: "/zdjecia/kokos.png",
    skill: "ass",
    wzrost: "niski",
    region: "potasze",
    kortyzol: "wysoki",
    rokUrodzenia: "2008",
  },
  {
    name: "rommatren",
    image: "/zdjecia/rommatren.png",
    skill: "mid",
    wzrost: "sredni",
    region: "potrzanowo",
    kortyzol: "wysoki",
    rokUrodzenia: "2007",
  },
  {
    name: "stusiso",
    image: "/zdjecia/stusiso.png",
    skill: "goated",
    wzrost: "wysoki",
    region: "biedrusko",
    kortyzol: "niski",
    rokUrodzenia: "2007",
  },
  {
    name: "szymon",
    image: "/zdjecia/szymon.png",
    skill: "mid",
    wzrost: "sredni",
    region: "poznan",
    kortyzol: "sredni",
    rokUrodzenia: "2007",
  },
  {
    name: "thefolt",
    image: "/zdjecia/thefolt.png",
    skill: "ass",
    wzrost: "sredni",
    region: "poznan",
    kortyzol: "wysoki",
    rokUrodzenia: "2007",
  },
  {
    name: "unc",
    image: "/zdjecia/unc.png",
    skill: "mid",
    wzrost: "wysoki",
    region: "plock",
    kortyzol: "sredni",
    rokUrodzenia: "2007",
  },
  {
    name: "wietek",
    image: "/zdjecia/wietek.png",
    skill: "mid",
    wzrost: "sredni",
    region: "poznan",
    kortyzol: "niski",
    rokUrodzenia: "2007",
  },
  {
    name: "stelerek",
    image: "/zdjecia/stelerek.png",
    skill: "mid",
    wzrost: "wysoki",
    region: "gdansk",
    kortyzol: "wysoki",
    rokUrodzenia: "2006",
  },
  {
    name: "graceusz",
    image: "/zdjecia/graceusz.png",
    skill: "ass",
    wzrost: "sredni",
    region: "kassel",
    kortyzol: "niski",
    rokUrodzenia: "2006",
  },
  {
    name: "mrkacper",
    image: "/zdjecia/mrkacper.png",
    skill: "mid",
    wzrost: "wysoki",
    region: "warszawa",
    kortyzol: "niski",
    rokUrodzenia: "2006",
  },
  {
    name: "demogames",
    image: "/zdjecia/demogames.gif",
    skill: "mid",
    wzrost: "sredni",
    region: "wadowice",
    kortyzol: "niski",
    rokUrodzenia: "2003",
  },
  {
    name: "gandalf",
    image: "/zdjecia/gandalf.png",
    skill: "mid",
    wzrost: "sredni",
    region: "tczew",
    kortyzol: "sredni",
    rokUrodzenia: "2005",
  },
  {
    name: "neira",
    image: "/zdjecia/neira.png",
    skill: "ass",
    wzrost: "niski",
    region: "krakow",
    kortyzol: "wysoki",
    rokUrodzenia: "2006",
  },
  {
    name: "koko",
    image: "/zdjecia/koko.png",
    skill: "ass",
    wzrost: "wysoki",
    region: "stargard",
    kortyzol: "niski",
    rokUrodzenia: "2009",
  },

].map(f => ({ ...f, image: `${BASE}${f.image.slice(1)}` }));

const CATEGORIES = [
  { key: "skill", label: "Skill" },
  { key: "wzrost", label: "Wzrost" },
  { key: "region", label: "Region" },
  { key: "kortyzol", label: "Kortyzol" },
  { key: "rokUrodzenia", label: "Rok ur." },
];

function getDailyFriend() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return FRIENDS[seed % FRIENDS.length];
}

function getRandomFriend(excludeName) {
  const pool = FRIENDS.filter((f) => f.name !== excludeName);
  return pool[Math.floor(Math.random() * pool.length)] || FRIENDS[0];
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem("namedle_stats"));
    if (s) return s;
  } catch {}
  return { totalWins: 0, todayDate: "", todayWins: 0 };
}

function recordWin() {
  const stats = loadStats();
  const today = getTodayKey();
  if (stats.todayDate !== today) {
    stats.todayDate = today;
    stats.todayWins = 0;
  }
  stats.totalWins++;
  stats.todayWins++;
  localStorage.setItem("namedle_stats", JSON.stringify(stats));
  return stats;
}

function loadDaily() {
  try {
    const s = JSON.parse(localStorage.getItem("namedle_daily"));
    if (s && s.date === getTodayKey()) return { guesses: s.guesses, won: s.won };
  } catch {}
  return { guesses: [], won: false };
}

export default function Namedle() {
  const [mode, setMode] = useState("daily");
  const [answer, setAnswer] = useState(getDailyFriend);
  const [guesses, setGuesses] = useState(() => loadDaily().guesses);
  const [won, setWon] = useState(() => loadDaily().won);
  const [filter, setFilter] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [totalWins, setTotalWins] = useState(() => loadStats().totalWins);
  const [winPosition, setWinPosition] = useState(() => {
    const saved = loadDaily();
    if (saved.won) {
      const stats = loadStats();
      if (stats.todayDate === getTodayKey()) return stats.todayWins;
    }
    return 0;
  });
  const dropRef = useRef(null);
  const dailySave = useRef({ guesses: [], won: false });

  const guessedNames = guesses.map((g) => g.name);
  const filtered = FRIENDS
    .filter((f) => !guessedNames.includes(f.name) && f.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (mode === "daily") {
      localStorage.setItem("namedle_daily", JSON.stringify({ date: getTodayKey(), guesses, won }));
    }
  }, [guesses, won, mode]);

  function playWin() {
    new Audio(`${BASE}win.mp3`).play();
  }

  function pick(friend) {
    setGuesses((prev) => [...prev, friend]);
    setFilter("");
    setShowDrop(false);
    if (friend.name === answer.name) {
      setWon(true);
      playWin();
      const stats = recordWin();
      setTotalWins(stats.totalWins);
      setWinPosition(stats.todayWins);
    }
  }

  function nextRound() {
    setAnswer(getRandomFriend(answer.name));
    setGuesses([]);
    setWon(false);
    setFilter("");
  }

  function switchMode(m) {
    if (m === mode) return;
    if (mode === "daily") dailySave.current = { guesses, won };
    setMode(m);
    setFilter("");
    if (m === "daily") {
      setGuesses(dailySave.current.guesses);
      setWon(dailySave.current.won);
      setAnswer(getDailyFriend());
    } else {
      setGuesses([]);
      setWon(false);
      setAnswer(getRandomFriend(""));
    }
  }

  const ok = (guess, key) => guess[key] === answer[key];

  return (
    <div style={{
      minHeight: "100vh", background: "#0b0b0f", color: "#ddd",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 12px",
    }}>
      <style>{`
        @keyframes pop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .cell { animation: pop 0.3s ease both; }
        .drop-item:hover { background: #1a1a2a !important; }
        .btn {
          cursor: pointer; border: none; font-family: inherit;
          border-radius: 8px; padding: 8px 20px; font-size: 13px; font-weight: 600;
          transition: all 0.15s;
        }
        .btn-on { background: #7c3aed; color: #fff; }
        .btn-off { background: #161620; color: #666; }
        .btn-off:hover { background: #1e1e2e; color: #999; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "0 0 4px" }}>
        <img src={`${BASE}zdjecia/noname.png`} alt="name" style={{ height: "clamp(32px, 7vw, 48px)", display: "block" }} />
        <h1 style={{
          fontSize: "clamp(32px, 7vw, 48px)", fontWeight: 900, margin: 0,
          letterSpacing: "-1.5px", lineHeight: 1, color: "#fff",
          transform: "translateY(-4px)",
        }}>DLE</h1>
      </div>
      <p style={{ color: "#555", fontSize: "13px", margin: "0 0 4px" }}>
        Zgaduj zgadula.
      </p>
      <p style={{ color: "#444", fontSize: "11px", margin: "0 0 16px", fontStyle: "italic" }}>
        Z czasem coraz więcej osób zostanie dodanych.
      </p>

      {/* Mode */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "24px" }}>
        <button className={`btn ${mode === "daily" ? "btn-on" : "btn-off"}`} onClick={() => switchMode("daily")}>Codzienny</button>
        <button className={`btn ${mode === "infinite" ? "btn-on" : "btn-off"}`} onClick={() => switchMode("infinite")}>Nieskończony</button>
      </div>

      {/* Input */}
      {!won && (
        <div ref={dropRef} style={{ position: "relative", width: "100%", maxWidth: "340px", marginBottom: "24px", zIndex: 10 }}>
          <input
            placeholder="Wpisz nick..."
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
            onKeyDown={(e) => { if (e.key === "Enter" && filtered.length > 0) pick(filtered[0]); }}
            style={{
              width: "100%", padding: "12px 16px", background: "#131318",
              border: "1px solid #222", borderRadius: "10px", color: "#ddd",
              fontSize: "15px", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
          />
          {showDrop && filtered.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px",
              background: "#131318", border: "1px solid #222", borderRadius: "10px",
              overflowY: "auto", maxHeight: "240px", boxShadow: "0 12px 32px #00000088",
            }}>
              {filtered.map((f) => (
                <div key={f.name} className="drop-item" onClick={() => pick(f)} style={{
                  padding: "10px 16px", cursor: "pointer", display: "flex",
                  alignItems: "center", gap: "10px", borderBottom: "1px solid #1a1a1a", fontSize: "14px",
                }}>
                  <img src={f.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a2a" }} />
                  <span style={{ fontWeight: 600 }}>{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {guesses.length > 0 && (
        <div style={{ width: "100%", maxWidth: "680px", overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "130px repeat(5, 1fr)", gap: "3px", marginBottom: "3px", minWidth: "580px" }}>
            <div style={{ fontSize: "10px", color: "#555", padding: "4px 8px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Kto?</div>
            {CATEGORIES.map((c) => (
              <div key={c.key} style={{ fontSize: "10px", color: "#555", padding: "4px", textAlign: "center", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>{c.label}</div>
            ))}
          </div>

          {[...guesses].reverse().map((guess, i) => (
            <div key={guesses.length - 1 - i} style={{
              display: "grid", gridTemplateColumns: "130px repeat(5, 1fr)",
              gap: "3px", marginBottom: "3px", minWidth: "580px",
            }}>
              <div className="cell" style={{
                background: guess.name === answer.name ? "#16a34a" : "#161620",
                borderRadius: "6px", padding: "8px", display: "flex",
                alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700,
                color: guess.name === answer.name ? "#fff" : "#c4b5fd",
              }}>
                <img src={guess.image} alt="" style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a1a2a", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guess.name}</span>
              </div>

              {CATEGORIES.map((c, ci) => (
                <div key={c.key} className="cell" style={{
                  animationDelay: `${(ci + 1) * 80}ms`,
                  background: ok(guess, c.key) ? "#16a34a" : "#161620",
                  borderRadius: "6px", padding: "8px 4px", textAlign: "center",
                  fontSize: "12px", fontWeight: ok(guess, c.key) ? 700 : 500,
                  color: ok(guess, c.key) ? "#fff" : "#888",
                }}>{guess[c.key]}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Win */}
      {won && (
        <div style={{ textAlign: "center", marginTop: "28px", animation: "pop 0.4s ease" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#22c55e", marginBottom: "4px" }}>Brawo!</div>
          <p style={{ color: "#666", fontSize: "13px", margin: "0 0 8px" }}>
            To był <strong style={{ color: "#c4b5fd" }}>{answer.name}</strong> - {guesses.length}{" "}
            {guesses.length === 1 ? "próba" : guesses.length < 5 ? "próby" : "prób"}
          </p>
          {winPosition > 0 && (
            <p style={{ color: "#888", fontSize: "12px", margin: "0 0 16px" }}>
              Jesteś <strong style={{ color: "#facc15" }}>{winPosition}.</strong> osobą, która dzisiaj rozwiązała namedle!
            </p>
          )}
          {mode === "infinite" && (
            <button onClick={nextRound} className="btn btn-on">Następny →</button>
          )}
        </div>
      )}

      <div style={{ marginTop: "20px", fontSize: "12px", color: "#444" }}>
        Próby: {guesses.length}
      </div>

      <div style={{
        position: "fixed", bottom: "28px", left: "14px",
        fontSize: "11px", color: "#555", pointerEvents: "none",
      }}>wygrane: {totalWins}</div>
      <div style={{
        position: "fixed", bottom: "12px", left: "14px",
        fontSize: "12px", color: "#fff", pointerEvents: "none",
      }}>made by czerwony :&gt;</div>

      {/* Patch notes button */}
      <button
        onClick={() => setShowNotes(true)}
        title="Patch notes"
        style={{
          position: "fixed", top: "14px", right: "14px",
          background: "#161620", border: "1px solid #2a2a3a",
          borderRadius: "8px", padding: "6px 10px", fontSize: "16px",
          cursor: "pointer", lineHeight: 1, color: "#fff",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#1e1e2e"}
        onMouseLeave={e => e.currentTarget.style.background = "#161620"}
      >📃</button>

      {/* Patch notes panel */}
      {showNotes && (
        <>
          <div
            onClick={() => setShowNotes(false)}
            style={{
              position: "fixed", inset: 0, background: "#00000066", zIndex: 50,
            }}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(320px, 90vw)",
            background: "#0f0f16", borderLeft: "1px solid #1e1e2e",
            zIndex: 51, overflowY: "auto", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: "24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#c4b5fd" }}>Patch Notes</h2>
              <button
                onClick={() => setShowNotes(false)}
                style={{
                  background: "none", border: "none", color: "#555",
                  fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: 0,
                }}
              >✕</button>
            </div>
            {PATCH_NOTES.map((entry, idx) => (
              <div key={entry.version}>
                {idx > 0 && (
                  <div style={{ height: "1px", background: "#1a1a2a", marginBottom: "24px" }} />
                )}
                <div style={{ display: "flex", gap: "8px", alignItems: "baseline", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "#fff" }}>v{entry.version}</span>
                  <span style={{ fontSize: "11px", color: "#444" }}>{entry.date}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {entry.changes.map((c, i) => (
                    <li key={i} style={{ fontSize: "13px", color: "#888", lineHeight: 1.5 }}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

createRoot(document.getElementById("app")).render(<Namedle />);
