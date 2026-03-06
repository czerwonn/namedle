import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  getGlobalWins, recordWin as recordWinFB, getLeaderboard,
  getUserStats, getDailyPlayerCount, getAllFriends,
  addFriend, updateFriend, deleteFriend,
  getAllQuotes, addQuote, updateQuote, deleteQuote,
  getProposals, addProposal, updateProposalStatus,
  setUserServer as setUserServerFB,
  getAllPatchNotes, addPatchNote, updatePatchNote, deletePatchNote,
} from "./firebase";
import {
  getDiscordLoginUrl, parseDiscordToken, fetchDiscordUser,
  getStoredUser, getStoredToken, discordLogout, getAvatarUrl,
} from "./discord";

const BASE = import.meta.env.BASE_URL;
const ADMIN_DISCORD_ID = "442046464290586654";


const CATEGORIES = [
  { key: "skill", label: "Skill" },
  { key: "wzrost", label: "Wzrost" },
  { key: "region", label: "Region" },
  { key: "kortyzol", label: "Kortyzol" },
  { key: "rokUrodzenia", label: "Rok ur." },
  { key: "server", label: "Serwer" },
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

function getDailyQuote(quotes) {
  if (quotes.length === 0) return null;
  const sorted = [...quotes].sort((a, b) => a.text.localeCompare(b.text));
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return sorted[(seed * 7 + 3) % sorted.length];
}

function getRandomQuote(quotes, excludeText) {
  const pool = quotes.filter((q) => q.text !== excludeText);
  return pool[Math.floor(Math.random() * pool.length)] || quotes[0];
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

function loadDailyQuote() {
  try {
    const s = JSON.parse(localStorage.getItem("namedle_daily_quote"));
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

function loadDailyQuotePosition() {
  try {
    const pos = JSON.parse(localStorage.getItem("namedle_daily_quote_position"));
    if (pos && pos.date === getTodayKey()) return pos.position;
  } catch {}
  return 0;
}



const emptyAdminForm = { name: "", image: "", skill: "mid", wzrost: "sredni", region: "", kortyzol: "sredni", rokUrodzenia: "", server: "" };
const emptyQuoteForm = { text: "", author: "" };

export default function Namedle() {
  const [authState, setAuthState] = useState("loading");
  const [discordUser, setDiscordUser] = useState(null);

  const [friends, setFriends] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  const [mode, setMode] = useState("daily");
  const [answer, setAnswer] = useState(null);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [guesses, setGuesses] = useState(() => loadDaily().guesses);
  const [won, setWon] = useState(() => loadDaily().won);
  const [filter, setFilter] = useState("");
  const [showDrop, setShowDrop] = useState(false);

  const [showNotes, setShowNotes] = useState(false);
  const [patchNotes, setPatchNotes] = useState([]);
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
  const [quoteWinPosition, setQuoteWinPosition] = useState(() => {
    if (loadDailyQuote().won) return loadDailyQuotePosition();
    return 0;
  });

  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardTab, setLeaderboardTab] = useState("dailyStreak");
  const [leaderboardCategory, setLeaderboardCategory] = useState("pojedyncze");
  const [userStats, setUserStats] = useState(null);
  const [userServer, setUserServer] = useState(() => localStorage.getItem("namedle_user_server") || "");
  const [serverConfirmed, setServerConfirmed] = useState(() => !!localStorage.getItem("namedle_user_server"));
  const [serverResetUsed, setServerResetUsed] = useState(() => !!localStorage.getItem("namedle_server_reset_used"));
  const [showServerPicker, setShowServerPicker] = useState(false);
  const [pendingServer, setPendingServer] = useState("");
  const [playersToday, setPlayersToday] = useState(0);

  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminEditing, setAdminEditing] = useState(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminSection, setAdminSection] = useState("friends");
  const [adminQuoteForm, setAdminQuoteForm] = useState(emptyQuoteForm);
  const [adminQuoteEditing, setAdminQuoteEditing] = useState(null);
  const [adminPatchForm, setAdminPatchForm] = useState({ version: "", date: "", image: "", changes: "" });
  const [adminPatchEditing, setAdminPatchEditing] = useState(null);

  const [showProposal, setShowProposal] = useState(false);
  const [proposalType, setProposalType] = useState("");
  const [proposalPersonForm, setProposalPersonForm] = useState(emptyAdminForm);
  const [proposalQuoteForm, setProposalQuoteForm] = useState(emptyQuoteForm);
  const [proposalTargetPerson, setProposalTargetPerson] = useState(null);
  const [proposalTargetQuote, setProposalTargetQuote] = useState(null);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [proposalApprovingId, setProposalApprovingId] = useState(null);

  const dropRef = useRef(null);
  const dailySave = useRef({ ...loadDaily(), date: getTodayKey() });
  const dailyQuoteSave = useRef({ ...loadDailyQuote(), date: getTodayKey() });

  const isQuoteMode = mode === "dailyQuote";
  const isDailyMode = mode === "daily" || mode === "dailyQuote";

  const guessedNames = guesses.map((g) => g.name);
  const filtered = friends
    .filter((f) => !guessedNames.includes(f.name) && f.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const isAdmin = discordUser && discordUser.id === ADMIN_DISCORD_ID;
  const todayKey = getTodayKey();
  const classicDailyDone = (userStats?.lastClassicDailyWinDate === todayKey) || (mode === "daily" && won) || loadDaily().won;
  const quoteDailyDone = (userStats?.lastQuoteDailyWinDate === todayKey) || (mode === "dailyQuote" && won) || loadDailyQuote().won;

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

      const [friendsList, wins, stats, quotesList, patchList] = await Promise.all([
        getAllFriends(), getGlobalWins(), getUserStats(user.id), getAllQuotes(), getAllPatchNotes(),
      ]);
      setFriends(friendsList);
      setQuotes(quotesList);
      setPatchNotes(patchList);
      setFriendsLoaded(true);
      setGlobalWins(wins);
      localStorage.setItem("namedle_global_cache", wins);
      if (stats) {
        setUserStats(stats);
        const localServer = localStorage.getItem("namedle_user_server");
        if (localServer && !stats.server) {
          setUserServerFB(user.id, localServer);
        } else if (stats.server && !localServer) {
          localStorage.setItem("namedle_user_server", stats.server);
          setUserServer(stats.server);
          setServerConfirmed(true);
        }
      }
      setAuthState("ready");
    }
    init();
  }, []);

  useEffect(() => {
    if (friendsLoaded && friends.length > 0) {
      const dailyFriend = getDailyFriend(friends);
      if (!answer && mode === "daily") setAnswer(dailyFriend);
      if (mode === "daily" && won && dailyFriend) {
        const hasCorrectGuess = guesses.some((g) => g.name === dailyFriend.name);
        if (!hasCorrectGuess) {
          setGuesses([]);
          setWon(false);
          setWinPosition(0);
        }
      }
    }
  }, [friendsLoaded, friends]);

  useEffect(() => {
    if (mode === "dailyQuote" && !answer && friends.length > 0 && quotes.length > 0) {
      const q = getDailyQuote(quotes);
      if (q) {
        const found = friends.find((f) => f.name.toLowerCase() === (q.author || "").toLowerCase()) || null;
        setCurrentQuote(q);
        setAnswer(found);
      }
    }
  }, [mode, friends, quotes]);

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    let lastDate = getTodayKey();
    function checkDateChange() {
      if (document.visibilityState !== "visible") return;
      const today = getTodayKey();
      if (today !== lastDate) {
        lastDate = today;
        if (mode === "daily") {
          setGuesses([]);
          setWon(false);
          setWinPosition(0);
          if (friends.length > 0) setAnswer(getDailyFriend(friends));
        } else if (mode === "dailyQuote") {
          setGuesses([]);
          setWon(false);
          if (quotes.length > 0) {
            const q = getDailyQuote(quotes);
            setCurrentQuote(q);
            if (q) setAnswer(friends.find((f) => f.name === q.author) || null);
          }
        }
        dailySave.current = { guesses: [], won: false, date: today };
        dailyQuoteSave.current = { guesses: [], won: false, date: today };
      }
    }
    document.addEventListener("visibilitychange", checkDateChange);
    return () => document.removeEventListener("visibilitychange", checkDateChange);
  }, [mode, friends, quotes]);

  useEffect(() => {
    if (mode === "daily") {
      localStorage.setItem("namedle_daily", JSON.stringify({ date: getTodayKey(), guesses, won }));
    }
    if (mode === "dailyQuote") {
      localStorage.setItem("namedle_daily_quote", JSON.stringify({ date: getTodayKey(), guesses, won }));
    }
  }, [guesses, won, mode]);

  function closeAllPanels() {
    setShowNotes(false);
    setShowLeaderboard(false);
    setShowStats(false);
    setShowAdmin(false);
    setShowProposal(false);
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
      recordWinFB(dateKey, mode, discordUser).then(async (res) => {
        if (res.globalWins > 0) {
          setGlobalWins(res.globalWins);
          localStorage.setItem("namedle_global_cache", res.globalWins);
        }
        if (res.dailyPosition > 0) {
          setWinPosition(res.dailyPosition);
          localStorage.setItem("namedle_daily_position", JSON.stringify({ date: dateKey, position: res.dailyPosition }));
        }
        if (res.quoteDailyPosition > 0) {
          setQuoteWinPosition(res.quoteDailyPosition);
          localStorage.setItem("namedle_daily_quote_position", JSON.stringify({ date: dateKey, position: res.quoteDailyPosition }));
        }

        if (discordUser) {
          const stats = await getUserStats(discordUser.id);
          if (stats) setUserStats(stats);
        }
      });
    }
  }

  function nextRound() {
    if (isQuoteMode) {
      const q = getRandomQuote(quotes, currentQuote?.text);
      setCurrentQuote(q);
      if (q) setAnswer(friends.find((f) => f.name === q.author) || null);
    } else {
      setAnswer(getRandomFriend(friends, answer?.name));
    }
    setGuesses([]);
    setWon(false);
    setFilter("");
  }

  function switchMode(m) {
    if (m === mode) return;
    if (mode === "daily") dailySave.current = { guesses, won, date: getTodayKey() };
    if (mode === "dailyQuote") dailyQuoteSave.current = { guesses, won, date: getTodayKey() };

    setMode(m);
    setFilter("");
    setShowDrop(false);

    if (m === "daily") {
      const today = getTodayKey();
      if (dailySave.current.date === today) {
        setGuesses(dailySave.current.guesses);
        setWon(dailySave.current.won);
      } else {
        setGuesses([]);
        setWon(false);
        setWinPosition(0);
      }
      setAnswer(getDailyFriend(friends));
      setCurrentQuote(null);
    } else if (m === "infinite") {
      setGuesses([]);
      setWon(false);
      setAnswer(getRandomFriend(friends, ""));
      setCurrentQuote(null);
    } else if (m === "dailyQuote") {
      const saved = loadDailyQuote();
      const q = getDailyQuote(quotes);
      const foundAnswer = q ? (friends.find((f) => f.name.toLowerCase() === (q.author || "").toLowerCase()) || null) : null;
      // validate saved won: only trust it if there's actually a correct guess
      const wonValid = saved.won && foundAnswer && saved.guesses.some((g) => g.name === foundAnswer.name);
      setGuesses(saved.guesses);
      setWon(wonValid);
      setCurrentQuote(q);
      setAnswer(foundAnswer);
    } else if (["noname", "yesname", "kropka", "kotomoto"].includes(m)) {
      setGuesses([]);
      setWon(false);
      setCurrentQuote(null);
      const pool = friends.filter((f) => f.server === m);
      const src = pool.length > 0 ? pool : friends;
      setAnswer(src[Math.floor(Math.random() * src.length)]);
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

  const SERVER_META = {
    noname:   { label: "No Name",  color: "#6366f1" },
    yesname:  { label: "Yes Name", color: "#888888" },
    kropka:   { label: "Kropka",   color: "#f59e0b" },
    kotomoto: { label: "Kotomoto", color: "#ef4444" },
  };

  function confirmServer() {
    if (!pendingServer) return;
    setUserServer(pendingServer);
    setServerConfirmed(true);
    setShowServerPicker(false);
    localStorage.setItem("namedle_user_server", pendingServer);
    if (discordUser) setUserServerFB(discordUser.id, pendingServer);
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
    setAdminQuoteEditing(null);
    setAdminQuoteForm(emptyQuoteForm);
    setShowAdmin(true);
    getProposals("pending").then(setProposals);
  }

  function startEdit(friend) {
    setAdminEditing(friend.id);
    setAdminForm({
      name: friend.name, image: friend.image || "",
      skill: friend.skill, wzrost: friend.wzrost,
      region: friend.region, kortyzol: friend.kortyzol,
      rokUrodzenia: friend.rokUrodzenia,
      server: friend.server || "",
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
      skill: adminForm.skill, wzrost: adminForm.wzrost,
      region: adminForm.region.trim().toLowerCase(),
      kortyzol: adminForm.kortyzol,
      rokUrodzenia: adminForm.rokUrodzenia.trim(),
      server: adminForm.server,
    };
    let success;
    if (adminEditing) success = await updateFriend(adminEditing, data);
    else success = await addFriend(data);
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
    if (await deleteFriend(id)) setFriends(await getAllFriends());
  }

  function startQuoteEdit(q) {
    setAdminQuoteEditing(q.id);
    setAdminQuoteForm({ text: q.text, author: q.author });
  }

  function cancelQuoteEdit() {
    setAdminQuoteEditing(null);
    setAdminQuoteForm(emptyQuoteForm);
  }

  async function handleQuoteSubmit() {
    setAdminSubmitting(true);
    const data = {
      text: adminQuoteForm.text.trim(),
      author: adminQuoteForm.author,
      submittedBy: "admin",
      createdAt: Date.now(),
    };
    let success;
    if (adminQuoteEditing) success = await updateQuote(adminQuoteEditing, data);
    else success = await addQuote(data);
    if (success) {
      setQuotes(await getAllQuotes());
      setAdminQuoteForm(emptyQuoteForm);
      setAdminQuoteEditing(null);
    }
    setAdminSubmitting(false);
  }

  async function handleQuoteDelete(id) {
    if (!confirm("Usunąć cytat?")) return;
    if (await deleteQuote(id)) setQuotes(await getAllQuotes());
  }

  function openProposalPanel() {
    closeAllPanels();
    setProposalType("");
    setProposalPersonForm(emptyAdminForm);
    setProposalQuoteForm(emptyQuoteForm);
    setProposalTargetPerson(null);
    setProposalTargetQuote(null);
    setProposalSubmitting(false);
    setProposalSuccess(false);
    setShowProposal(true);
  }

  async function handleSubmitProposal() {
    setProposalSubmitting(true);
    let data;
    const personData = {
      name: proposalPersonForm.name.trim().toLowerCase(),
      image: proposalPersonForm.image.trim(),
      skill: proposalPersonForm.skill,
      wzrost: proposalPersonForm.wzrost,
      region: proposalPersonForm.region.trim().toLowerCase(),
      kortyzol: proposalPersonForm.kortyzol,
      rokUrodzenia: proposalPersonForm.rokUrodzenia.trim(),
      server: proposalPersonForm.server,
    };
    const base = {
      submittedBy: discordUser.id,
      submittedByName: discordUser.global_name || discordUser.username,
      createdAt: Date.now(),
      status: "pending",
    };
    if (proposalType === "addPerson") {
      data = { ...base, type: "addPerson", data: personData };
    } else if (proposalType === "editPerson") {
      data = { ...base, type: "editPerson", targetId: proposalTargetPerson.id, targetName: proposalTargetPerson.name, data: personData };
    } else if (proposalType === "addQuote") {
      data = { ...base, type: "addQuote", data: { text: proposalQuoteForm.text.trim(), author: proposalQuoteForm.author, submittedBy: discordUser.id, createdAt: Date.now() } };
    } else if (proposalType === "editQuote") {
      data = { ...base, type: "editQuote", targetId: proposalTargetQuote.id, targetName: proposalTargetQuote.text.substring(0, 50), data: { text: proposalQuoteForm.text.trim(), author: proposalQuoteForm.author, submittedBy: proposalTargetQuote.submittedBy || discordUser.id, createdAt: proposalTargetQuote.createdAt || Date.now() } };
    }
    const ok2 = await addProposal(data);
    setProposalSubmitting(false);
    if (ok2) setProposalSuccess(true);
  }

  async function handleApproveProposal(proposal) {
    setProposalApprovingId(proposal.id);
    let success = false;
    if (proposal.type === "addPerson") {
      success = await addFriend(proposal.data);
      if (success) setFriends(await getAllFriends());
    } else if (proposal.type === "editPerson") {
      success = await updateFriend(proposal.targetId, proposal.data);
      if (success) setFriends(await getAllFriends());
    } else if (proposal.type === "addQuote") {
      success = await addQuote(proposal.data);
      if (success) setQuotes(await getAllQuotes());
    } else if (proposal.type === "editQuote") {
      success = await updateQuote(proposal.targetId, proposal.data);
      if (success) setQuotes(await getAllQuotes());
    }
    if (success) {
      await updateProposalStatus(proposal.id, { ...proposal, status: "approved" });
      setProposals(await getProposals("pending"));
    }
    setProposalApprovingId(null);
  }

  async function handleRejectProposal(proposal) {
    setProposalApprovingId(proposal.id);
    await updateProposalStatus(proposal.id, { ...proposal, status: "rejected" });
    setProposals(await getProposals("pending"));
    setProposalApprovingId(null);
  }

  const ok = (guess, key) => guess[key] === answer?.[key];
  const noQuotes = isQuoteMode && quotes.length === 0;

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

  if (!answer && !isQuoteMode && friends.length > 0) {
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
        .btn-sm { padding: 6px 14px; font-size: 11px; }
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
        Z czasem coraz więcej osób i cytatów zostanie dodanych.
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", marginBottom: isDailyMode ? "8px" : "24px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button className={`btn ${mode === "daily" ? "btn-on" : "btn-off"}`} onClick={() => switchMode("daily")}>Codzienny</button>
          <button className={`btn ${mode === "infinite" ? "btn-on" : "btn-off"}`} onClick={() => switchMode("infinite")}>Nieskończony</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button className={`btn btn-sm ${mode === "dailyQuote" ? "btn-on" : "btn-off"}`} onClick={() => switchMode("dailyQuote")}>Cytaty dzienne</button>
        </div>
      </div>

      {isDailyMode && (
        <div style={{ textAlign: "center", marginBottom: "16px", fontSize: "12px", color: "#888" }}>
          <div>Twoja dzienna passa: <strong style={{ color: "#c4b5fd" }}>{userStats ? userStats.dailyStreak : 0}</strong></div>
          <div>Twoja najdłuższa dzienna passa: <strong style={{ color: "#c4b5fd" }}>{userStats ? userStats.maxDailyStreak : 0}</strong></div>
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#555" }}>
            Klasyczny: {classicDailyDone ? "✅" : "❌"} | Cytaty: {quoteDailyDone ? "✅" : "❌"}
          </div>
        </div>
      )}

      {isQuoteMode && currentQuote && !noQuotes && (
        <div style={{
          maxWidth: "400px", width: "100%", padding: "20px 24px",
          background: "#131318", border: "1px solid #222", borderRadius: "12px",
          marginBottom: "20px", textAlign: "center",
        }}>
          <div style={{ fontSize: "11px", color: "#555", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Kto to powiedział?</div>
          <div style={{ fontSize: "16px", color: "#c4b5fd", fontStyle: "italic", lineHeight: 1.5 }}>
            &ldquo;{currentQuote.text}&rdquo;
          </div>
        </div>
      )}

      {noQuotes && (
        <p style={{ color: "#555", fontSize: "13px", margin: "0 0 24px" }}>Brak cytatów w bazie. Dodaj cytaty przez panel admina.</p>
      )}

      {!won && !noQuotes && answer && (
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

      {!isQuoteMode && guesses.length > 0 && (
        <div style={{ width: "100%", maxWidth: "860px", overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px repeat(6, 1fr)", gap: "4px", marginBottom: "4px", minWidth: "800px" }}>
            <div style={{ fontSize: "10px", color: "#555", padding: "4px 8px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Kto?</div>
            {CATEGORIES.map((c) => (
              <div key={c.key} style={{ fontSize: "10px", color: "#555", padding: "4px", textAlign: "center", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>{c.label}</div>
            ))}
          </div>

          {[...guesses].reverse().map((guess, i) => (
            <div key={guesses.length - 1 - i} style={{
              display: "grid", gridTemplateColumns: "140px repeat(6, 1fr)",
              gap: "4px", marginBottom: "4px", minWidth: "800px",
            }}>
              <div className="cell" style={{
                background: guess.name === answer?.name ? "#16a34a" : "#161620",
                borderRadius: "6px", padding: "8px", display: "flex",
                alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700,
                color: guess.name === answer?.name ? "#fff" : "#c4b5fd",
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
                }}>{c.key === "server" ? (SERVER_META[guess[c.key]]?.label || guess[c.key] || "—") : guess[c.key]}</div>
              ))}
            </div>
          ))}
        </div>
      )}


      {isQuoteMode && guesses.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", maxWidth: "400px" }}>
          {[...guesses].reverse().map((g, i) => (
            <div key={guesses.length - 1 - i} className="cell" style={{
              padding: "8px 16px", borderRadius: "8px",
              background: g.name === answer?.name ? "#16a34a" : "#161620",
              color: g.name === answer?.name ? "#fff" : "#888",
              fontSize: "13px", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              {g.image && <img src={g.image} alt="" style={{ width: 22, height: 22, borderRadius: "50%", background: "#1a1a2a", flexShrink: 0 }} />}
              {g.name}
            </div>
          ))}
        </div>
      )}

      {won && (
        <div style={{ textAlign: "center", marginTop: "28px", animation: "pop 0.4s ease" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#22c55e", marginBottom: "4px" }}>Brawo!</div>
          <p style={{ color: "#666", fontSize: "13px", margin: "0 0 8px" }}>
            {isQuoteMode ? (
              <>To powiedział <strong style={{ color: "#c4b5fd" }}>{answer?.name}</strong> - {guesses.length}{" "}
              {guesses.length === 1 ? "próba" : guesses.length < 5 ? "próby" : "prób"}</>
            ) : (
              <>To był <strong style={{ color: "#c4b5fd" }}>{answer?.name}</strong> - {guesses.length}{" "}
              {guesses.length === 1 ? "próba" : guesses.length < 5 ? "próby" : "prób"}</>
            )}
          </p>
          {mode === "daily" && winPosition > 0 && (
            <p style={{ color: "#888", fontSize: "12px", margin: "0 0 16px" }}>
              Jesteś <strong style={{ color: "#facc15" }}>{winPosition}.</strong> osobą, która dzisiaj rozwiązała namedle!
            </p>
          )}
          {mode === "dailyQuote" && quoteWinPosition > 0 && (
            <p style={{ color: "#888", fontSize: "12px", margin: "0 0 16px" }}>
              Jesteś <strong style={{ color: "#facc15" }}>{quoteWinPosition}.</strong> osobą, która dzisiaj rozwiązała cytat!
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

      <div style={{ position: "fixed", top: "52px", left: "14px", zIndex: 40 }}>
        {serverConfirmed && userServer ? (
          <span style={{ fontSize: "11px", fontWeight: 700, color: SERVER_META[userServer]?.color || "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
            {SERVER_META[userServer]?.label}
            {(isAdmin || !serverResetUsed) && (
              <button onClick={() => {
                localStorage.removeItem("namedle_user_server");
                setUserServer("");
                setServerConfirmed(false);
                if (discordUser) setUserServerFB(discordUser.id, "");
                if (!isAdmin) {
                  localStorage.setItem("namedle_server_reset_used", "1");
                  setServerResetUsed(true);
                }
              }} style={{ background: "none", border: "none", color: "#444", fontSize: "10px", cursor: "pointer", padding: 0, lineHeight: 1 }} title="Zmień serwer">✕</button>
            )}
          </span>
        ) : (
          <button onClick={() => { setPendingServer(""); setShowServerPicker(true); }} className="btn btn-off">
            Wybierz serwer
          </button>
        )}
      </div>

      <div style={{ position: "fixed", top: "14px", right: "14px", display: "flex", gap: "6px", zIndex: 40 }}>
        <button onClick={openProposalPanel} title="Zaproponuj dodanie/zmianę"
          style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "6px 10px", fontSize: "16px", cursor: "pointer", lineHeight: 1, color: "#fff", transition: "background 0.15s" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#1e1e2e"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#161620"}>➕</button>
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
        {isAdmin && (
          <button onClick={openAdmin} title="Admin"
            style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "6px 10px", fontSize: "16px", cursor: "pointer", lineHeight: 1, color: "#fff", transition: "background 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#1e1e2e"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#161620"}>⚙️</button>
        )}
      </div>

      {showLeaderboard && (
        <>
          <div onClick={() => setShowLeaderboard(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 95vw)",
            background: "#0f0f16", borderLeft: "1px solid #1e1e2e",
            zIndex: 51, overflowY: "auto", padding: "28px 24px",
            display: "flex", flexDirection: "column", gap: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#facc15" }}>Leaderboard</h2>
              <button onClick={() => setShowLeaderboard(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            {/* Top-level category tabs */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
              {[{ key: "pojedyncze", label: "POJEDYNCZE" }, { key: "serwerowe", label: "SERWEROWE" }].map((c) => (
                <button key={c.key} onClick={() => { setLeaderboardCategory(c.key); if (c.key === "pojedyncze") fetchLeaderboardTab(leaderboardTab); else getLeaderboard("wins").then(setLeaderboard); }}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: 800,
                    border: `1px solid ${leaderboardCategory === c.key ? "#7c3aed" : "#2a2a3a"}`,
                    background: leaderboardCategory === c.key ? "#7c3aed22" : "#161620",
                    color: leaderboardCategory === c.key ? "#c4b5fd" : "#555", cursor: "pointer",
                    letterSpacing: "0.06em",
                  }}>{c.label}</button>
              ))}
            </div>

            {leaderboardCategory === "pojedyncze" && (
              <>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
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
                  const sm = SERVER_META[entry.server];
                  return (
                    <div key={entry.id} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 14px", background: idx < 3 ? "#161620" : "transparent", borderRadius: "8px",
                    }}>
                      <span style={{ width: "28px", textAlign: "center", fontSize: medal ? "18px" : "13px", color: "#555", fontWeight: 700, flexShrink: 0 }}>
                        {medal || `#${idx + 1}`}
                      </span>
                      <img src={avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: "50%", background: "#1a1a2a", flexShrink: 0 }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#ddd", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.name}
                      </span>
                      {sm && (
                        <span style={{ fontSize: "10px", fontWeight: 700, color: sm.color, background: sm.color + "18", borderRadius: "4px", padding: "2px 6px", flexShrink: 0 }}>
                          {sm.label}
                        </span>
                      )}
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#7c3aed", flexShrink: 0 }}>
                        {entry[leaderboardTab]}
                      </span>
                    </div>
                  );
                })}
              </>
            )}

            {leaderboardCategory === "serwerowe" && (() => {
              const totals = Object.entries(SERVER_META).map(([key, meta]) => {
                const members = leaderboard.filter((e) => e.server === key);
                return {
                  key, meta,
                  totalWins: members.reduce((s, e) => s + e.wins, 0),
                  members,
                };
              }).sort((a, b) => b.totalWins - a.totalWins);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {totals.map((srv, idx) => {
                    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                    return (
                      <div key={srv.key} style={{ borderRadius: "10px", border: `1px solid ${srv.meta.color}44`, overflow: "hidden" }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "12px 14px", background: srv.meta.color + "18",
                        }}>
                          <span style={{ fontSize: medal ? "20px" : "14px", flexShrink: 0 }}>{medal || `#${idx + 1}`}</span>
                          <span style={{ fontSize: "14px", fontWeight: 800, color: srv.meta.color, flex: 1 }}>{srv.meta.label}</span>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: srv.meta.color }}>{srv.totalWins} wygranych</span>
                        </div>
                        {srv.members.length > 0 && (
                          <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {srv.members.sort((a, b) => b.wins - a.wins).map((m) => {
                              const avatarUrl = m.avatar
                                ? `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=32`
                                : `https://cdn.discordapp.com/embed/avatars/0.png`;
                              return (
                                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <img src={avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%", background: "#1a1a2a", flexShrink: 0 }} />
                                  <span style={{ fontSize: "12px", color: "#aaa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                                  <span style={{ fontSize: "11px", color: "#555", flexShrink: 0 }}>{m.wins} wygranych</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {srv.members.length === 0 && (
                          <div style={{ padding: "8px 14px", fontSize: "12px", color: "#333" }}>Brak graczy</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {showStats && (
        <>
          <div onClick={() => setShowStats(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(460px, 95vw)",
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
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 95vw)",
            background: "#0f0f16", borderLeft: "1px solid #1e1e2e",
            zIndex: 51, overflowY: "auto", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: "16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ef4444" }}>Admin Panel</h2>
              <button onClick={() => setShowAdmin(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={() => setAdminSection("friends")}
                className={`btn ${adminSection === "friends" ? "btn-on" : "btn-off"}`}
                style={{ fontSize: "12px", padding: "6px 14px" }}>Osoby</button>
              <button onClick={() => setAdminSection("quotes")}
                className={`btn ${adminSection === "quotes" ? "btn-on" : "btn-off"}`}
                style={{ fontSize: "12px", padding: "6px 14px" }}>Cytaty</button>
              <button onClick={() => { setAdminSection("proposals"); getProposals("pending").then(setProposals); }}
                className={`btn ${adminSection === "proposals" ? "btn-on" : "btn-off"}`}
                style={{ fontSize: "12px", padding: "6px 14px" }}>
                Wnioski{proposals.length > 0 ? ` (${proposals.length})` : ""}
              </button>
              <button onClick={() => setAdminSection("patchNotes")}
                className={`btn ${adminSection === "patchNotes" ? "btn-on" : "btn-off"}`}
                style={{ fontSize: "12px", padding: "6px 14px" }}>Patch Notes</button>
            </div>

            {adminSection === "friends" && (
              <>
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
                <select value={adminForm.server}
                  onChange={(e) => setAdminForm((f) => ({ ...f, server: e.target.value }))} style={adminInputStyle}>
                  <option value="">— Główny serwer —</option>
                  <option value="noname">No Name</option>
                  <option value="yesname">Yes Name</option>
                  <option value="kropka">Kropka</option>
                  <option value="kotomoto">Kotomoto</option>
                </select>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button disabled={adminSubmitting || !adminForm.name} onClick={handleAdminSubmit}
                    className="btn btn-on" style={{ opacity: adminSubmitting ? 0.5 : 1, flex: 1 }}>
                    {adminSubmitting ? "..." : adminEditing ? "Zapisz" : "Dodaj"}
                  </button>
                  {adminEditing && <button onClick={cancelEdit} className="btn btn-off">Anuluj</button>}
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
                    {f.server && SERVER_META[f.server] && (
                      <span style={{ fontSize: "10px", fontWeight: 700, color: SERVER_META[f.server].color, background: SERVER_META[f.server].color + "18", borderRadius: "4px", padding: "2px 6px", flexShrink: 0 }}>
                        {SERVER_META[f.server].label}
                      </span>
                    )}
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
              </>
            )}

            {adminSection === "quotes" && (
              <>
                <h3 style={{ fontSize: "12px", color: "#555", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>
                  {adminQuoteEditing ? "Edytuj cytat" : "Dodaj cytat"}
                </h3>

                <textarea placeholder="Treść cytatu..." value={adminQuoteForm.text}
                  onChange={(e) => setAdminQuoteForm((f) => ({ ...f, text: e.target.value }))}
                  style={{ ...adminInputStyle, minHeight: "80px", resize: "vertical" }} />
                <select value={adminQuoteForm.author}
                  onChange={(e) => setAdminQuoteForm((f) => ({ ...f, author: e.target.value }))} style={adminInputStyle}>
                  <option value="">-- Kto to powiedział? --</option>
                  {[...friends].sort((a, b) => a.name.localeCompare(b.name)).map((f) => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button disabled={adminSubmitting || !adminQuoteForm.text || !adminQuoteForm.author}
                    onClick={handleQuoteSubmit} className="btn btn-on"
                    style={{ opacity: adminSubmitting ? 0.5 : 1, flex: 1 }}>
                    {adminSubmitting ? "..." : adminQuoteEditing ? "Zapisz" : "Dodaj"}
                  </button>
                  {adminQuoteEditing && <button onClick={cancelQuoteEdit} className="btn btn-off">Anuluj</button>}
                </div>

                <div style={{ height: "1px", background: "#1a1a2a" }} />

                <h3 style={{ fontSize: "12px", color: "#555", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>
                  Cytaty ({quotes.length})
                </h3>

                {quotes.map((q) => (
                  <div key={q.id} style={{
                    padding: "10px 12px", background: "#161620", borderRadius: "8px",
                    display: "flex", flexDirection: "column", gap: "4px",
                  }}>
                    <div style={{ fontSize: "13px", color: "#c4b5fd", fontStyle: "italic" }}>&ldquo;{q.text}&rdquo;</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "#555" }}>~ {q.author}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => startQuoteEdit(q)}
                          style={{ background: "none", border: "none", color: "#7c3aed", fontSize: "12px", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>
                          Edytuj
                        </button>
                        <button onClick={() => handleQuoteDelete(q.id)}
                          style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>
                          Usuń
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {adminSection === "proposals" && (
              <>
                <h3 style={{ fontSize: "12px", color: "#555", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>
                  Oczekujące wnioski ({proposals.length})
                </h3>

                {proposals.length === 0 && (
                  <p style={{ color: "#444", fontSize: "13px" }}>Brak wniosków. Wszystko zatwierdzone!</p>
                )}

                {proposals.map((p) => {
                  const typeLabel = { addPerson: "Nowa osoba", editPerson: "Zmiana osoby", addQuote: "Nowy cytat", editQuote: "Zmiana cytatu" }[p.type];
                  const typeColor = { addPerson: "#22c55e", editPerson: "#3b82f6", addQuote: "#a855f7", editQuote: "#f59e0b" }[p.type];
                  const isLoading = proposalApprovingId === p.id;
                  return (
                    <div key={p.id} style={{ padding: "12px", background: "#161620", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ background: typeColor + "22", color: typeColor, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{typeLabel}</span>
                        <span style={{ fontSize: "11px", color: "#555" }}>od {p.submittedByName}</span>
                      </div>

                      {(p.type === "editPerson" || p.type === "editQuote") && (
                        <div style={{ fontSize: "11px", color: "#666", fontStyle: "italic" }}>
                          Zmiana: <strong style={{ color: "#888" }}>{p.targetName}</strong>
                        </div>
                      )}

                      {(p.type === "addPerson" || p.type === "editPerson") && p.data && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                          {[
                            ["Nick", p.data.name],
                            ["Skill", p.data.skill],
                            ["Wzrost", p.data.wzrost],
                            ["Region", p.data.region],
                            ["Kortyzol", p.data.kortyzol],
                            ["Rok ur.", p.data.rokUrodzenia],
                          ].map(([label, val]) => (
                            <div key={label} style={{ fontSize: "12px", color: "#888" }}>
                              <span style={{ color: "#555" }}>{label}: </span>{val || "—"}
                            </div>
                          ))}
                        </div>
                      )}

                      {(p.type === "addQuote" || p.type === "editQuote") && p.data && (
                        <div>
                          <div style={{ fontSize: "13px", color: "#c4b5fd", fontStyle: "italic", marginBottom: "4px" }}>&ldquo;{p.data.text}&rdquo;</div>
                          <div style={{ fontSize: "11px", color: "#555" }}>~ {p.data.author}</div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                        <button onClick={() => handleApproveProposal(p)} disabled={isLoading}
                          style={{ flex: 1, background: "#16a34a22", border: "1px solid #16a34a44", borderRadius: "8px", color: "#22c55e", fontSize: "12px", fontWeight: 700, padding: "6px", cursor: "pointer", fontFamily: "inherit", opacity: isLoading ? 0.5 : 1 }}>
                          {isLoading ? "..." : "✓ Zatwierdź"}
                        </button>
                        <button onClick={() => handleRejectProposal(p)} disabled={isLoading}
                          style={{ flex: 1, background: "#ef444422", border: "1px solid #ef444444", borderRadius: "8px", color: "#ef4444", fontSize: "12px", fontWeight: 700, padding: "6px", cursor: "pointer", fontFamily: "inherit", opacity: isLoading ? 0.5 : 1 }}>
                          {isLoading ? "..." : "✗ Odrzuć"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {adminSection === "patchNotes" && (
              <>
                <h3 style={{ fontSize: "12px", color: "#555", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>
                  {adminPatchEditing ? "Edytuj patch note" : "Dodaj patch note"}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <input placeholder="Wersja (np. 2.1)" value={adminPatchForm.version}
                      onChange={(e) => setAdminPatchForm((f) => ({ ...f, version: e.target.value }))}
                      style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "8px 12px", color: "#ddd", fontFamily: "inherit", fontSize: "13px" }} />
                    <input placeholder="Data (np. 06.03.2026)" value={adminPatchForm.date}
                      onChange={(e) => setAdminPatchForm((f) => ({ ...f, date: e.target.value }))}
                      style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "8px 12px", color: "#ddd", fontFamily: "inherit", fontSize: "13px" }} />
                  </div>
                  <input placeholder="URL obrazka (opcjonalnie)" value={adminPatchForm.image}
                    onChange={(e) => setAdminPatchForm((f) => ({ ...f, image: e.target.value }))}
                    style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "8px 12px", color: "#ddd", fontFamily: "inherit", fontSize: "13px" }} />
                  <textarea placeholder="Zmiany (każda linia = osobna zmiana)" value={adminPatchForm.changes}
                    onChange={(e) => setAdminPatchForm((f) => ({ ...f, changes: e.target.value }))}
                    rows={5}
                    style={{ background: "#161620", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "8px 12px", color: "#ddd", fontFamily: "inherit", fontSize: "13px", resize: "vertical" }} />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button disabled={adminSubmitting || !adminPatchForm.version || !adminPatchForm.changes.trim()} onClick={async () => {
                      setAdminSubmitting(true);
                      const data = {
                        version: adminPatchForm.version.trim(),
                        date: adminPatchForm.date.trim(),
                        image: adminPatchForm.image.trim(),
                        changes: adminPatchForm.changes.trim().split("\n").filter((l) => l.trim()),
                        createdAt: adminPatchEditing ? (patchNotes.find((p) => p.id === adminPatchEditing)?.createdAt || Date.now()) : Date.now(),
                      };
                      if (adminPatchEditing) {
                        await updatePatchNote(adminPatchEditing, data);
                      } else {
                        await addPatchNote(data);
                      }
                      setPatchNotes(await getAllPatchNotes());
                      setAdminPatchForm({ version: "", date: "", image: "", changes: "" });
                      setAdminPatchEditing(null);
                      setAdminSubmitting(false);
                    }} className="btn btn-on" style={{ flex: 1, fontSize: "12px", opacity: adminSubmitting ? 0.5 : 1 }}>
                      {adminSubmitting ? "..." : adminPatchEditing ? "Zapisz zmiany" : "Dodaj"}
                    </button>
                    {adminPatchEditing && (
                      <button onClick={() => { setAdminPatchEditing(null); setAdminPatchForm({ version: "", date: "", image: "", changes: "" }); }}
                        className="btn btn-off" style={{ fontSize: "12px" }}>Anuluj</button>
                    )}
                  </div>
                </div>

                <h3 style={{ fontSize: "12px", color: "#555", fontWeight: 700, textTransform: "uppercase", margin: "8px 0 0" }}>
                  Lista ({patchNotes.length})
                </h3>
                {patchNotes.map((p) => (
                  <div key={p.id} style={{ padding: "10px 12px", background: "#161620", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: "#fff" }}>v{p.version} <span style={{ fontSize: "11px", color: "#444", fontWeight: 400 }}>{p.date}</span></span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => {
                          setAdminPatchEditing(p.id);
                          setAdminPatchForm({ version: p.version, date: p.date || "", image: p.image || "", changes: (p.changes || []).join("\n") });
                        }} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>edytuj</button>
                        <button onClick={async () => {
                          if (!confirm("Usunąć ten patch note?")) return;
                          await deletePatchNote(p.id);
                          setPatchNotes(await getAllPatchNotes());
                        }} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>usuń</button>
                      </div>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "16px" }}>
                      {(p.changes || []).map((c, i) => (
                        <li key={i} style={{ fontSize: "12px", color: "#888", lineHeight: 1.5 }}>{c}</li>
                      ))}
                    </ul>
                    {p.image && <div style={{ fontSize: "11px", color: "#444" }}>📷 {p.image}</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {showProposal && (
        <>
          <div onClick={() => setShowProposal(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 95vw)",
            background: "#0f0f16", borderLeft: "1px solid #1e1e2e",
            zIndex: 51, overflowY: "auto", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: "16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#22c55e" }}>➕ Zaproponuj</h2>
              <button onClick={() => setShowProposal(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            {proposalSuccess ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#22c55e", marginBottom: "8px" }}>good boy</div>
                <p style={{ color: "#666", fontSize: "13px", margin: "0 0 20px" }}>Zaraz obczaje</p>
                <button onClick={() => { setProposalSuccess(false); setProposalType(""); }} className="btn btn-off">wyślij kolejną</button>
              </div>
            ) : (
              <>
                {!proposalType && (
                  <>
                    <p style={{ color: "#666", fontSize: "13px", margin: 0 }}>Co chcesz zaproponować?</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {[
                        { key: "addPerson", label: "Nowa osoba", icon: "👤" },
                        { key: "editPerson", label: "Zmień osobę", icon: "✏️" },
                        { key: "addQuote", label: "Nowy cytat", icon: "💬" },
                        { key: "editQuote", label: "Zmień cytat", icon: "📝" },
                      ].map((t) => (
                        <button key={t.key} onClick={() => {
                          setProposalType(t.key);
                          setProposalPersonForm(emptyAdminForm);
                          setProposalQuoteForm(emptyQuoteForm);
                          setProposalTargetPerson(null);
                          setProposalTargetQuote(null);
                        }} style={{
                          background: "#161620", border: "1px solid #2a2a3a", borderRadius: "10px",
                          padding: "16px 12px", cursor: "pointer", color: "#ddd",
                          fontFamily: "inherit", fontSize: "13px", fontWeight: 600,
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                          transition: "background 0.15s",
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#1e1e2e"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#161620"}>
                          <span style={{ fontSize: "22px" }}>{t.icon}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {(proposalType === "addPerson" || proposalType === "editPerson") && (
                  <>
                    <p style={{ color: "#888", fontSize: "12px", margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                      {proposalType === "addPerson" ? "Nowa osoba" : "Zmień osobę"}
                    </p>

                    {proposalType === "editPerson" && (
                      <select value={proposalTargetPerson?.id || ""} onChange={(e) => {
                        const f = friends.find((x) => x.id === e.target.value) || null;
                        setProposalTargetPerson(f);
                        if (f) setProposalPersonForm({ name: f.name, image: f.image || "", skill: f.skill, wzrost: f.wzrost, region: f.region, kortyzol: f.kortyzol, rokUrodzenia: f.rokUrodzenia });
                      }} style={adminInputStyle}>
                        <option value="">-- Kogo chcesz zmienić? --</option>
                        {[...friends].sort((a, b) => a.name.localeCompare(b.name)).map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    )}

                    {(proposalType === "addPerson" || proposalTargetPerson) && (
                      <>
                        <input placeholder="Nick" value={proposalPersonForm.name}
                          onChange={(e) => setProposalPersonForm((f) => ({ ...f, name: e.target.value }))} style={adminInputStyle} />
                        <input placeholder="dodaj tutaj ID na discordzie tej osoby. (zebym mogl dodac awatar)" value={proposalPersonForm.image}
                          onChange={(e) => setProposalPersonForm((f) => ({ ...f, image: e.target.value }))} style={adminInputStyle} />
                        <select value={proposalPersonForm.skill}
                          onChange={(e) => setProposalPersonForm((f) => ({ ...f, skill: e.target.value }))} style={adminInputStyle}>
                          <option value="goated">goated</option>
                          <option value="mid">mid</option>
                          <option value="ass">ass</option>
                        </select>
                        <select value={proposalPersonForm.wzrost}
                          onChange={(e) => setProposalPersonForm((f) => ({ ...f, wzrost: e.target.value }))} style={adminInputStyle}>
                          <option value="niski">niski</option>
                          <option value="sredni">sredni</option>
                          <option value="wysoki">wysoki</option>
                        </select>
                        <input placeholder="Region (miasto)" value={proposalPersonForm.region}
                          onChange={(e) => setProposalPersonForm((f) => ({ ...f, region: e.target.value }))} style={adminInputStyle} />
                        <select value={proposalPersonForm.kortyzol}
                          onChange={(e) => setProposalPersonForm((f) => ({ ...f, kortyzol: e.target.value }))} style={adminInputStyle}>
                          <option value="niski">niski</option>
                          <option value="sredni">sredni</option>
                          <option value="wysoki">wysoki</option>
                        </select>
                        <input placeholder="Rok urodzenia" value={proposalPersonForm.rokUrodzenia}
                          onChange={(e) => setProposalPersonForm((f) => ({ ...f, rokUrodzenia: e.target.value }))} style={adminInputStyle} />
                        <select value={proposalPersonForm.server}
                          onChange={(e) => setProposalPersonForm((f) => ({ ...f, server: e.target.value }))} style={adminInputStyle}>
                          <option value="">— Główny serwer —</option>
                          <option value="noname">No Name</option>
                          <option value="yesname">Yes Name</option>
                          <option value="kropka">Kropka</option>
                          <option value="kotomoto">Kotomoto</option>
                        </select>
                      </>
                    )}
                  </>
                )}

                {(proposalType === "addQuote" || proposalType === "editQuote") && (
                  <>
                    <p style={{ color: "#888", fontSize: "12px", margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                      {proposalType === "addQuote" ? "Nowy cytat" : "Zmień cytat"}
                    </p>

                    {proposalType === "editQuote" && (
                      <select value={proposalTargetQuote?.id || ""} onChange={(e) => {
                        const q = quotes.find((x) => x.id === e.target.value) || null;
                        setProposalTargetQuote(q);
                        if (q) setProposalQuoteForm({ text: q.text, author: q.author });
                      }} style={adminInputStyle}>
                        <option value="">-- Który cytat zmienić? --</option>
                        {quotes.map((q) => (
                          <option key={q.id} value={q.id}>{q.text.substring(0, 55)}… ~ {q.author}</option>
                        ))}
                      </select>
                    )}

                    {(proposalType === "addQuote" || proposalTargetQuote) && (
                      <>
                        <textarea placeholder="Treść cytatu..." value={proposalQuoteForm.text}
                          onChange={(e) => setProposalQuoteForm((f) => ({ ...f, text: e.target.value }))}
                          style={{ ...adminInputStyle, minHeight: "80px", resize: "vertical" }} />
                        <select value={proposalQuoteForm.author}
                          onChange={(e) => setProposalQuoteForm((f) => ({ ...f, author: e.target.value }))} style={adminInputStyle}>
                          <option value="">-- Kto to powiedział? --</option>
                          {[...friends].sort((a, b) => a.name.localeCompare(b.name)).map((f) => (
                            <option key={f.id} value={f.name}>{f.name}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </>
                )}

                {proposalType && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button onClick={() => { setProposalType(""); setProposalTargetPerson(null); setProposalTargetQuote(null); }}
                      className="btn btn-off">← Wróć</button>
                    <button
                      disabled={proposalSubmitting || !(
                        (proposalType === "addPerson" && proposalPersonForm.name.trim()) ||
                        (proposalType === "editPerson" && proposalTargetPerson && proposalPersonForm.name.trim()) ||
                        (proposalType === "addQuote" && proposalQuoteForm.text.trim() && proposalQuoteForm.author) ||
                        (proposalType === "editQuote" && proposalTargetQuote && proposalQuoteForm.text.trim() && proposalQuoteForm.author)
                      )}
                      onClick={handleSubmitProposal}
                      className="btn btn-on" style={{ flex: 1, opacity: proposalSubmitting ? 0.5 : 1 }}>
                      {proposalSubmitting ? "Wysyłanie..." : "Zaproponuj"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {showNotes && (
        <>
          <div onClick={() => setShowNotes(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(460px, 95vw)",
            background: "#0f0f16", borderLeft: "1px solid #1e1e2e",
            zIndex: 51, overflowY: "auto", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: "24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#c4b5fd" }}>Patch Notes</h2>
              <button onClick={() => setShowNotes(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>
            {patchNotes.map((entry, idx) => (
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
                {entry.image && (
                  <img src={entry.image} alt="" style={{ marginTop: "12px", width: "100%", borderRadius: "8px", border: "1px solid #1e1e2e" }} />
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {showServerPicker && (
        <>
          <div onClick={() => serverConfirmed && setShowServerPicker(false)}
            style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 100 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "#0f0f16", border: "1px solid #2a2a3a", borderRadius: "12px",
            padding: "28px 24px", zIndex: 101, width: "min(460px, 95vw)",
            display: "flex", flexDirection: "column", gap: "16px", textAlign: "center",
          }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 800, color: "#facc15" }}>Wybierz swój serwer</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>Wybór jest jednorazowy i nie można go zmienić.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {Object.entries(SERVER_META).map(([key, meta]) => (
                <button key={key} onClick={() => setPendingServer(key)}
                  style={{
                    background: pendingServer === key ? meta.color + "22" : "#161620",
                    border: `1px solid ${pendingServer === key ? meta.color : "#2a2a3a"}`,
                    borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontWeight: 700,
                    color: pendingServer === key ? meta.color : "#666", cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                  {meta.label}
                </button>
              ))}
            </div>
            <button onClick={confirmServer} disabled={!pendingServer}
              style={{
                background: pendingServer ? "#7c3aed" : "#1a1a2a",
                border: "none", borderRadius: "8px", padding: "10px 16px",
                fontSize: "13px", fontWeight: 700, color: pendingServer ? "#fff" : "#333",
                cursor: pendingServer ? "pointer" : "not-allowed", transition: "all 0.15s",
              }}>
              Potwierdź wybór
            </button>
          </div>
        </>
      )}

    </div>
  );
}

createRoot(document.getElementById("app")).render(<Namedle />);
