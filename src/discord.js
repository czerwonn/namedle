const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const REDIRECT_URI = window.location.origin + window.location.pathname;

export function getDiscordLoginUrl() {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "token",
    scope: "identify",
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

export function parseDiscordToken() {
  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token")) return null;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get("access_token");
  if (token) {
    window.history.replaceState(null, "", window.location.pathname);
    localStorage.setItem("namedle_discord_token", token);
  }
  return token;
}

export async function fetchDiscordUser(token) {
  try {
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    localStorage.setItem("namedle_discord_user", JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("namedle_discord_user"));
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return localStorage.getItem("namedle_discord_token");
}

export function discordLogout() {
  localStorage.removeItem("namedle_discord_user");
  localStorage.removeItem("namedle_discord_token");
}

export function getAvatarUrl(user) {
  if (!user) return null;
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  const idx = Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}
