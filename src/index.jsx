import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  getGlobalWins, recordWin as recordWinFB, getLeaderboard,
  getUserStats, getDailyPlayerCount, getAllFriends,
  addFriend, updateFriend, deleteFriend,
} from "./firebase";
import {
  getDiscordLoginUrl, parseDiscordToken, fetchDiscordUser,
  getStoredUser, getStoredToken, discordLogout, getAvatarUrl,
} from "./discord";

const BASE = import.meta.env.BASE_URL;
const ADMIN_DISCORD_ID = "442046464290586654";

const PATCH_NOTES = [
  {
    version: "1.51",
    date: "26.02.2026",
    changes: [
      "Wyświetlanie dziennej passy pod przyciskami trybu",
    ],
  },
  {
    version: "1.5",
    date: "26.02.2026",
    changes: [
      "Dodano panel statystyk",
      "Leaderboard z 3 zakładkami: passa, rekord, nieskończony",
      "Dodano system passy (daily streak)",
      "Panel administracyjny",
      "Osoby przeniesione do bazy danych",
    ],
  },
  {
    version: "1.4",
    date: "26.02.2026",
    changes: [
      "Dodano logowanie przez Discorda",
      "Globalny licznik wygranych",
      "Dodano leaderboard",
      "Naprawiono pozycje (tryb codzienny)",
    ],
  },
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
      "Dodano wsparcie dla entera",
    ],
  },
  {
    version: "1.1",
    date: "25.02.2026",
    changes: [
      "Dodano przycisk z patch notesami",
      "Zaaktualizowano dane o osobach",
      "Małe poprawki w kodzie",
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

const CATEGORIES = [
  { key: "skill", label: "Skill" },
  { key: "wzrost", label: "Wzrost" },
  { key: "region", label: "Region" },
  { key: "kortyzol", label: "Kortyzol" },
  { key: "rokUrodzenia", label: "Rok ur." },
];

const adminInputStyle = {
  width: "100%", padding: "10px 14px", background: "#131318",
  border: "1px solid #222", borderRadius: "8px", color: "#ddd",
  fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

function getDailyFriend(friends) {
  if (friends.length === 0) return null;
  const sorted = [...friends].sort((a, b) => a.name.localeCompare(b.name));
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return sorted[seed % sorted.length];
}

function getRandomFriend(friends, excludeName) {
  const pool = friends.filter((f) => f.name !== excludeName);
  return pool[Math.floor(Math.random() * pool.length)] || friends[0];
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadDaily() {
  try {
    const s = JSON.parse(localStorage.getItem("namedle_daily"));
    if (s && s.date === getTodayKey()) return { guesses: s.guesses, won: s.won };
  } catch {}
  return { guesses: [], won: false };
}

function loadDailyPosition() {
  try {
    const pos = JSON.parse(localStorage.getItem("namedle_daily_position"));
    if (pos && pos.date === getTodayKey()) return pos.position;
  } catch {}
  return 0;
}

const emptyAdminForm = { name: "", image: "", skill: "mid", wzrost: "sredni", region: "", kortyzol: "sredni", rokUrodzenia: "" };

export default function Namedle() {
  const [authState, setAuthState] = useState("loading");
  const [discordUser, setDiscordUser] = useState(null);

  const [friends, setFriends] = useState([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  const [mode, setMode] = useState("daily");
  const [answer, setAnswer] = useState(null);
  const [guesses, setGuesses] = useState(() => loadDaily().guesses);
  const [won, setWon] = useState(() => loadDaily().won);
  const [filter, setFilter] = useState("");
  const [showDrop, setShowDrop] = useState(false);

  const [showNotes, setShowNotes] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const [globalWins, setGlobalWins] = useState(() => {
    try { return parseInt(localStorage.getItem("namedle_global_cache")) || 0; } catch { return 0; }
  });
  const [winPosition, setWinPosition] = useState(() => {
    if (loadDaily().won) return loadDailyPosition();
    return 0;
  });

  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardTab, setLeaderboardTab] = useState("dailyStreak");
  const [userStats, setUserStats] = useState(null);
  const [playersToday, setPlayersToday] = useState(0);

  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminEditing, setAdminEditing] = useState(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const dropRef = useRef(null);
  const dailySave = useRef({ guesses: [], won: false });

  const guessedNames = guesses.map((g) => g.name);
  const filtered = friends
    .filter((f) => !guessedNames.includes(f.name) && f.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const isAdmin = discordUser && discordUser.id === ADMIN_DISCORD_ID;

  useEffect(() => {
    async function init() {
      let user = null;
      const newToken = parseDiscordToken();
      if (newToken) user = await fetchDiscordUser(newToken);
      if (!user) {
        const token = getStoredToken();
        if (token) user = await fetchDiscordUser(token);
      }
      if (!user) user = getStoredUser();

      if (!user) {
        setAuthState("login");
        return;
      }

      setDiscordUser(user);

      const [friendsList, wins, stats] = await Promise.all([getAllFriends(), getGlobalWins(), getUserStats(user.id)]);
      setFriends(friendsList);
      setFriendsLoaded(true);
      setGlobalWins(wins);
      localStorage.setItem("namedle_global_cache", wins);
      if (stats) setUserStats(stats);
      setAuthState("ready");
    }
    init();
  }, []);

  useEffect(() => {
    if (friendsLoaded && friends.length > 0 && !answer) {
      setAnswer(getDailyFriend(friends));
    }
  }, [friendsLoaded, friends, answer]);

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

  function closeAllPanels() {
    setShowNotes(false);
    setShowLeaderboard(false);
    setShowStats(false);
    setShowAdmin(false);
  }

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
      const dateKey = getTodayKey();
      const isDaily = mode === "daily";
      recordWinFB(dateKey, isDaily, discordUser).then(async (res) => {
        if (res.globalWins > 0) {
          setGlobalWins(res.globalWins);
          localStorage.setItem("namedle_global_cache", res.globalWins);
        }
        if (isDaily && res.dailyPosition > 0) {
          setWinPosition(res.dailyPosition);
          localStorage.setItem("namedle_daily_position", JSON.stringify({ date: dateKey, position: res.dailyPosition }));
        }
        if (discordUser) {
          const stats = await getUserStats(discordUser.id);
          if (stats) setUserStats(stats);
        }
      });
    }
  }

  function nextRound() {
    setAnswer(getRandomFriend(friends, answer.name));
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
      setAnswer(getDailyFriend(friends));
    } else {
      setGuesses([]);
      setWon(false);
      setAnswer(getRandomFriend(friends, ""));
    }
  }

  function handleLogout() {
    discordLogout();
    setDiscordUser(null);
    setAuthState("login");
  }

  function openLeaderboard() {
    closeAllPanels();
    fetchLeaderboardTab(leaderboardTab);
    setShowLeaderboard(true);
  }

  function fetchLeaderboardTab(tab) {
    getLeaderboard(tab).then(setLeaderboard);
  }

  function switchLeaderboardTab(tab) {
    setLeaderboardTab(tab);
    fetchLeaderboardTab(tab);
  }

  function openStats() {
    closeAllPanels();
    if (discordUser) getUserStats(discordUser.id).then(setUserStats);
    getDailyPlayerCount(getTodayKey()).then(setPlayersToday);
    setShowStats(true);
  }

  function openAdmin() {
    closeAllPanels();
    setAdminEditing(null);
    setAdminForm(emptyAdminForm);
    setShowAdmin(true);
  }

  function startEdit(friend) {
    setAdminEditing(friend.id);
    setAdminForm({
      name: friend.name,
      image: friend.image || "",
      skill: friend.skill,
      wzrost: friend.wzrost,
      region: friend.region,
      kortyzol: friend.kortyzol,
      rokUrodzenia: friend.rokUrodzenia,
    });
  }

  function cancelEdit() {
    setAdminEditing(null);
    setAdminForm(emptyAdminForm);
  }

  async function handleAdminSubmit() {
    setAdminSubmitting(true);
    const data = {
      name: adminForm.name.trim().toLowerCase(),
      image: adminForm.image.trim(),
      skill: adminForm.skill,
      wzrost: adminForm.wzrost,
      region: adminForm.region.trim().toLowerCase(),
      kortyzol: adminForm.kortyzol,
      rokUrodzenia: adminForm.rokUrodzenia.trim(),
    };

    let success;
    if (adminEditing) {
      success = await updateFriend(adminEditing, data);
    } else {
      success = await addFriend(data);
    }

    if (success) {
      const updated = await getAllFriends();
      setFriends(updated);
      setAdminForm(emptyAdminForm);
      setAdminEditing(null);
    }
    setAdminSubmitting(false);
  }

  async function handleAdminDelete(id, name) {
    if (!confirm(`Usunąć ${name}?`)) return;
    const success = await deleteFriend(id);
    if (success) {
      const updated = await getAllFriends();
      setFriends(updated);
    }
  }

  const ok = (guess, key) => guess[key] === answer[key];

  if (authState === "loading" || (authState === "ready" && !friendsLoaded)) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0b0b0f", color: "#555",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <p style={{ fontSize: "14px" }}>Ładowanie...</p>
      </div>
    );
  }

  if (authState === "login") {
    return (
      <div style={{
        minHeight: "100vh", background: "#0b0b0f", color: "#ddd",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "30px 12px", gap: "20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <img src={`${BASE}zdjecia/noname.png`} alt="name" style={{ height: 48, display: "block" }} />
          <h1 style={{
            fontSize: 48, fontWeight: 900, margin: 0,
            letterSpacing: "-1.5px", lineHeight: 1, color: "#fff",
            transform: "translateY(-4px)",
          }}>DLE</h1>
        </div>
        <p style={{ color: "#555", fontSize: "14px", margin: 0 }}>Połącz się z Discordem aby grać</p>
        <a
          href={getDiscordLoginUrl()}
          style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            background: "#5865F2", color: "#fff", borderRadius: "10px",
            padding: "14px 28px", fontSize: "15px", fontWeight: 700,
            textDecoration: "none", transition: "background 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#4752c4"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#5865F2"}
        >
          <svg width="20" height="16" viewBox="0 0 71 55" fill="none">
            <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.3 47.1 47.1 0 003.6 5.9.2.2 0 00.3.1A58.5 58.5 0 0070.4 45.6v-.1C72 30.1 68 16.7 60.2 5a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.9 7.2-6.4 7.2z" fill="#fff"/>
          </svg>
          Połącz z Discordem
        </a>
      </div>
    );
  }

  if (!answer) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0b0b0f", color: "#555",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <p style={{ fontSize: "14px" }}>Brak osób w bazie. Dodaj kogoś przez panel admina.</p>
      </div>
    );
  }

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

      {discordUser && (
        <div style={{
          position: "fixed", top: "14px", left: "14px", zIndex: 40,
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <img src={getAvatarUrl(discordUser)} alt=""
            style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a2a" }} />
          <span style={{ fontSize: "12px", color: "#888", fontWeight: 600 }}>
            {discordUser.global_name || discordUser.username}
          </span>
          <button onClick={handleLogout} title="Wyloguj"
            style={{ background: "none", border: "none", color: "#444", fontSize: "14px", cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>
            ✕
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "0 0 4px" }}>
        <img src={`${BASE}zdjecia/noname.png`} alt="name" style={{ height: "clamp(32px, 7vw, 48px)", display: "block" }} />
        <h1 style={{
          fontSize: "clamp(32px, 7vw, 48px)", fontWeight: 900, margin: 0,
          letterSpacing: "-1.5px", lineHeight: 1, color: "#fff", transform: "translateY(-4px)",
        }}>DLE</h1>
      </div>
      <p style={{ color: "#555", fontSize: "13px", margin: "0 0 4px" }}>Zgaduj zgadula.</p>
      <p style={{ color: "#444", fontSize: "11px", margin: "0 0 16px", fontStyle: "italic" }}>
        Z czasem coraz więcej osób zostanie dodanych.
      </p>

      <div style={{ display: "flex", gap: "6px", marginBottom: mode === "daily" ? "8px" : "24px" }}>
        <button className={`btn ${mode === "daily" ? "btn-on" : "btn-off"}`} onClick={() => switchMode("daily")}>Codzienny</button>
        <button className={`btn ${mode === "infinite" ? "btn-on" : "btn-off"}`} onClick={() => switchMode("infinite")}>Nieskończony</button>
      </div>

      {mode === "daily" && (
        <div style={{ textAlign: "center", marginBottom: "16px", fontSize: "12px", color: "#888" }}>
          <div>Twoja dzienna passa: <strong style={{ color: "#c4b5fd" }}>{userStats ? userStats.dailyStreak : 0}</strong></div>
          <div>Twoja najdłuższa dzienna passa: <strong style={{ color: "#c4b5fd" }}>{userStats ? userStats.maxDailyStreak : 0}</strong></div>
        </div>
      )}

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
                  {f.image && <img src={f.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a2a" }} />}
                  <span style={{ fontWeight: 600 }}>{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                {guess.image && <img src={guess.image} alt="" style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a1a2a", flexShrink: 0 }} />}
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

      {won && (
        <div style={{ textAlign: "center", marginTop: "28px", animation: "pop 0.4s ease" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#22c55e", marginBottom: "4px" }}>Brawo!</div>
          <p style={{ color: "#666", fontSize: "13px", margin: "0 0 8px" }}>
            To był <strong style={{ color: "#c4b5fd" }}>{answer.name}</strong> - {guesses.length}{" "}
            {guesses.length === 1 ? "próba" : guesses.length < 5 ? "próby" : "prób"}
          </p>
          {mode === "daily" && winPosition > 0 && (
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

      <div style={{ position: "fixed", bottom: "28px", left: "14px", fontSize: "11px", color: "#555", pointerEvents: "none" }}>
        wygrane: {globalWins}
      </div>
      <div style={{ position: "fixed", bottom: "12px", left: "14px", fontSize: "12px", color: "#fff", pointerEvents: "none" }}>
        made by czerwony :&gt;
      </div>

      <div style={{ position: "fixed", top: "14px", right: "14px", display: "flex", gap: "6px", zIndex: 40 }}>
        {isAdmin && (
          <button onClick={openAdmin} title="Admin"
            style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "6px 10px", fontSize: "16px", cursor: "pointer", lineHeight: 1, color: "#fff", transition: "background 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#1e1e2e"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#161620"}>⚙️</button>
        )}
        <button onClick={openLeaderboard} title="Leaderboard"
          style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "6px 10px", fontSize: "16px", cursor: "pointer", lineHeight: 1, color: "#fff", transition: "background 0.15s" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#1e1e2e"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#161620"}>🏆</button>
        <button onClick={openStats} title="Statystyki"
          style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "6px 10px", fontSize: "16px", cursor: "pointer", lineHeight: 1, color: "#fff", transition: "background 0.15s" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#1e1e2e"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#161620"}>📊</button>
        <button onClick={() => { closeAllPanels(); setShowNotes(true); }} title="Patch notes"
          style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "6px 10px", fontSize: "16px", cursor: "pointer", lineHeight: 1, color: "#fff", transition: "background 0.15s" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#1e1e2e"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#161620"}>📃</button>
      </div>

      {showLeaderboard && (
        <>
          <div onClick={() => setShowLeaderboard(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(340px, 90vw)",
            background: "#0f0f16", borderLeft: "1px solid #1e1e2e",
            zIndex: 51, overflowY: "auto", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#facc15" }}>Leaderboard</h2>
              <button onClick={() => setShowLeaderboard(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: "4px", marginBottom: "8px", flexWrap: "wrap" }}>
              {[
                { key: "dailyStreak", label: "Aktualna passa" },
                { key: "maxDailyStreak", label: "Rekordowa passa" },
                { key: "infiniteWins", label: "Nieskończony" },
              ].map((t) => (
                <button key={t.key} onClick={() => switchLeaderboardTab(t.key)}
                  className={`btn ${leaderboardTab === t.key ? "btn-on" : "btn-off"}`}
                  style={{ fontSize: "11px", padding: "6px 10px" }}>{t.label}</button>
              ))}
            </div>

            {leaderboard.filter((e) => e[leaderboardTab] > 0).length === 0 && (
              <p style={{ color: "#444", fontSize: "13px" }}>Brak danych.</p>
            )}
            {leaderboard.filter((e) => e[leaderboardTab] > 0).map((entry, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
              const avatarUrl = entry.avatar
                ? `https://cdn.discordapp.com/avatars/${entry.id}/${entry.avatar}.png?size=64`
                : `https://cdn.discordapp.com/embed/avatars/0.png`;
              return (
                <div key={entry.id} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", background: idx < 3 ? "#161620" : "transparent", borderRadius: "8px",
                }}>
                  <span style={{ width: "28px", textAlign: "center", fontSize: medal ? "18px" : "13px", color: "#555", fontWeight: 700, flexShrink: 0 }}>
                    {medal || `#${idx + 1}`}
                  </span>
                  <img src={avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a2a", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#ddd", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.name}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#7c3aed" }}>
                    {entry[leaderboardTab]}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showStats && (
        <>
          <div onClick={() => setShowStats(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(320px, 90vw)",
            background: "#0f0f16", borderLeft: "1px solid #1e1e2e",
            zIndex: 51, overflowY: "auto", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: "16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#22c55e" }}>Statystyki</h2>
              <button onClick={() => setShowStats(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            <div>
              <h3 style={{ fontSize: "12px", color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>Twoje statystyki</h3>
              {userStats ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    { label: "Aktualna passa", value: userStats.dailyStreak },
                    { label: "Rekordowa passa", value: userStats.maxDailyStreak },
                    { label: "Nieskończony", value: userStats.infiniteWins },
                    { label: "Razem wygrane", value: userStats.wins },
                  ].map((s) => (
                    <div key={s.label} style={{ background: "#161620", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "#c4b5fd" }}>{s.value}</div>
                      <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#444", fontSize: "13px" }}>Brak danych.</p>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: "12px", color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>Statystyki globalne</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ background: "#161620", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#facc15" }}>{globalWins}</div>
                  <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>Razem wygrane</div>
                </div>
                <div style={{ background: "#161620", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#facc15" }}>{playersToday}</div>
                  <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>Graczy dzisiaj</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showAdmin && isAdmin && (
        <>
          <div onClick={() => setShowAdmin(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(380px, 90vw)",
            background: "#0f0f16", borderLeft: "1px solid #1e1e2e",
            zIndex: 51, overflowY: "auto", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: "16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ef4444" }}>Admin Panel</h2>
              <button onClick={() => setShowAdmin(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            <h3 style={{ fontSize: "12px", color: "#555", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>
              {adminEditing ? "Edytuj osobę" : "Dodaj osobę"}
            </h3>

            <input placeholder="Nick" value={adminForm.name}
              onChange={(e) => setAdminForm((f) => ({ ...f, name: e.target.value }))} style={adminInputStyle} />
            <input placeholder="URL zdjęcia" value={adminForm.image}
              onChange={(e) => setAdminForm((f) => ({ ...f, image: e.target.value }))} style={adminInputStyle} />
            <select value={adminForm.skill}
              onChange={(e) => setAdminForm((f) => ({ ...f, skill: e.target.value }))} style={adminInputStyle}>
              <option value="goated">goated</option>
              <option value="mid">mid</option>
              <option value="ass">ass</option>
            </select>
            <select value={adminForm.wzrost}
              onChange={(e) => setAdminForm((f) => ({ ...f, wzrost: e.target.value }))} style={adminInputStyle}>
              <option value="niski">niski</option>
              <option value="sredni">sredni</option>
              <option value="wysoki">wysoki</option>
            </select>
            <input placeholder="Region (miasto)" value={adminForm.region}
              onChange={(e) => setAdminForm((f) => ({ ...f, region: e.target.value }))} style={adminInputStyle} />
            <select value={adminForm.kortyzol}
              onChange={(e) => setAdminForm((f) => ({ ...f, kortyzol: e.target.value }))} style={adminInputStyle}>
              <option value="niski">niski</option>
              <option value="sredni">sredni</option>
              <option value="wysoki">wysoki</option>
            </select>
            <input placeholder="Rok urodzenia" value={adminForm.rokUrodzenia}
              onChange={(e) => setAdminForm((f) => ({ ...f, rokUrodzenia: e.target.value }))} style={adminInputStyle} />

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                disabled={adminSubmitting || !adminForm.name}
                onClick={handleAdminSubmit}
                className="btn btn-on"
                style={{ opacity: adminSubmitting ? 0.5 : 1, flex: 1 }}>
                {adminSubmitting ? "..." : adminEditing ? "Zapisz" : "Dodaj"}
              </button>
              {adminEditing && (
                <button onClick={cancelEdit} className="btn btn-off">Anuluj</button>
              )}
            </div>

            <div style={{ height: "1px", background: "#1a1a2a" }} />

            <h3 style={{ fontSize: "12px", color: "#555", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>
              Osoby ({friends.length})
            </h3>

            {[...friends].sort((a, b) => a.name.localeCompare(b.name)).map((f) => (
              <div key={f.id} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 10px", background: "#161620", borderRadius: "8px",
              }}>
                {f.image && <img src={f.image} alt="" style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a1a2a", flexShrink: 0 }} />}
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#ddd", flex: 1 }}>{f.name}</span>
                <button onClick={() => startEdit(f)}
                  style={{ background: "none", border: "none", color: "#7c3aed", fontSize: "12px", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>
                  Edytuj
                </button>
                <button onClick={() => handleAdminDelete(f.id, f.name)}
                  style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>
                  Usuń
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {showNotes && (
        <>
          <div onClick={() => setShowNotes(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(320px, 90vw)",
            background: "#0f0f16", borderLeft: "1px solid #1e1e2e",
            zIndex: 51, overflowY: "auto", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: "24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#c4b5fd" }}>Patch Notes</h2>
              <button onClick={() => setShowNotes(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>
            {PATCH_NOTES.map((entry, idx) => (
              <div key={entry.version}>
                {idx > 0 && <div style={{ height: "1px", background: "#1a1a2a", marginBottom: "24px" }} />}
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
