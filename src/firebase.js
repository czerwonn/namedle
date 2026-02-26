import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, push, remove, runTransaction } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let db = null;
try {
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
} catch (e) {
  console.warn("Firebase init error:", e.message);
}

function getYesterdayKey(todayKey) {
  const [y, m, d] = todayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export async function getGlobalWins() {
  if (!db) return 0;
  try {
    const snap = await get(ref(db, "globalWins"));
    return snap.val() || 0;
  } catch {
    return 0;
  }
}

export async function getDailyPlayerCount(dateKey) {
  if (!db) return 0;
  try {
    const snap = await get(ref(db, `dailyWins/${dateKey}`));
    return snap.val() || 0;
  } catch {
    return 0;
  }
}

export async function recordWin(dateKey, isDaily, discordUser) {
  if (!db) return { globalWins: 0, dailyPosition: 0 };
  const result = { globalWins: 0, dailyPosition: 0 };

  try {
    const gTx = await runTransaction(ref(db, "globalWins"), (v) => (v || 0) + 1);
    result.globalWins = gTx.snapshot.val();

    if (isDaily) {
      const dTx = await runTransaction(ref(db, `dailyWins/${dateKey}`), (v) => (v || 0) + 1);
      result.dailyPosition = dTx.snapshot.val();
    }

    if (discordUser) {
      await runTransaction(ref(db, `leaderboard/${discordUser.id}`), (cur) => {
        const existing = cur || {};
        const totalWins = (existing.wins || 0) + 1;
        const infiniteWins = (existing.infiniteWins || 0) + (isDaily ? 0 : 1);

        let dailyStreak = existing.dailyStreak || 0;
        let maxDailyStreak = existing.maxDailyStreak || 0;
        let lastDailyWinDate = existing.lastDailyWinDate || null;

        if (isDaily) {
          if (lastDailyWinDate === dateKey) {
            // already won today
          } else if (lastDailyWinDate === getYesterdayKey(dateKey)) {
            dailyStreak = dailyStreak + 1;
          } else {
            dailyStreak = 1;
          }
          if (dailyStreak > maxDailyStreak) maxDailyStreak = dailyStreak;
          lastDailyWinDate = dateKey;
        }

        return {
          name: discordUser.global_name || discordUser.username,
          avatar: discordUser.avatar,
          wins: totalWins,
          infiniteWins,
          dailyStreak,
          maxDailyStreak,
          lastDailyWinDate,
        };
      });
    }
  } catch (e) {
    console.error("recordWin error:", e);
  }

  return result;
}

export async function getLeaderboard(sortBy = "wins") {
  if (!db) return [];
  try {
    const snap = await get(ref(db, "leaderboard"));
    const data = snap.val() || {};
    return Object.entries(data)
      .map(([id, v]) => ({
        id,
        name: v.name,
        avatar: v.avatar,
        wins: v.wins || 0,
        infiniteWins: v.infiniteWins || 0,
        dailyStreak: v.dailyStreak || 0,
        maxDailyStreak: v.maxDailyStreak || 0,
      }))
      .sort((a, b) => b[sortBy] - a[sortBy]);
  } catch {
    return [];
  }
}

export async function getUserStats(discordId) {
  if (!db || !discordId) return null;
  try {
    const snap = await get(ref(db, `leaderboard/${discordId}`));
    const v = snap.val();
    if (!v) return null;
    return {
      wins: v.wins || 0,
      infiniteWins: v.infiniteWins || 0,
      dailyStreak: v.dailyStreak || 0,
      maxDailyStreak: v.maxDailyStreak || 0,
    };
  } catch {
    return null;
  }
}

export async function getAllFriends() {
  if (!db) return [];
  try {
    const snap = await get(ref(db, "friends"));
    const data = snap.val() || {};
    return Object.entries(data).map(([id, v]) => ({ id, ...v }));
  } catch {
    return [];
  }
}

export async function addFriend(data) {
  if (!db) return false;
  try {
    await set(push(ref(db, "friends")), data);
    return true;
  } catch (e) {
    console.error("addFriend error:", e);
    return false;
  }
}

export async function updateFriend(id, data) {
  if (!db) return false;
  try {
    await set(ref(db, `friends/${id}`), data);
    return true;
  } catch (e) {
    console.error("updateFriend error:", e);
    return false;
  }
}

export async function deleteFriend(id) {
  if (!db) return false;
  try {
    await remove(ref(db, `friends/${id}`));
    return true;
  } catch (e) {
    console.error("deleteFriend error:", e);
    return false;
  }
}
