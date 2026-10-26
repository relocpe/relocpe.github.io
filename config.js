// Discord user id for the live Lanyard presence (https://github.com/Phineas/lanyard)
const DISCORD_ID = "1095706197081993279";
window.SV_DISCORD_ID = DISCORD_ID;
// Presence: our Cloudflare Worker proxy (worker/ — Lanyard REST + avatar; works where discord/lanyard are blocked).
// SV_PRESENCE_URL returns Lanyard JSON ({ success, data }); a URL ending in "/" gets the id appended (e.g. "https://api.lanyard.rest/v1/users/").
// If the proxy is unreachable the site falls back to api.lanyard.rest directly, then to the local card (assets/discord-avatar.png + handle).
window.SV_PRESENCE_URL = "https://samevamp-presence.samevamp.workers.dev/presence";
window.SV_AVATAR_URL = "https://samevamp-presence.samevamp.workers.dev/avatar";   // "" = cdn.discordapp.com directly
window.SV_IMG_URL = "https://samevamp-presence.samevamp.workers.dev/img";   // activity images proxy (/img?u=); "" = load discord/spotify image hosts directly
window.SV_DISCORD_HANDLE = "relocpe";

// Background videos: one is picked at random on every page load (with its poster).
// tools/add-video.sh encodes a file and rewrites this list. srcSmall (optional) = 720p copy for phones / data-saver. Keep each well under 100 MB (GitHub Pages).
window.SV_VIDEOS = [
  // { src: "bg.mp4", poster: "poster.jpg" },   // SLAVE - LAST SUMMER (removed by user)
  // { src: "bg2.mp4", poster: "poster2.jpg" },   // removed by user
  // { src: "bg3.mp4", srcSmall: "bg3-720.mp4", poster: "poster3.jpg" },   // replaced in v7.5
  // { src: "bg4.mp4", srcSmall: "bg4-720.mp4", poster: "poster4.jpg" },   // v7.5, replaced by the trimmed copy in v7.6
  { src: "bg5.mp4", srcSmall: "bg5-720.mp4", poster: "poster5.jpg" },   // v7.6: bg4 with the first 21.76 s cut (on a scene change), 2560x1440 25 fps
];

// Telegram: one account, several handles. PRIMARY gets the bright "write" button; the rest are shown as "aka" aliases.
window.SV_TELEGRAM = { primary: "relocpe", aliases: ["portfade"] };

// Stack line under the work panels ("stack: a / b / c"). Edit freely; an empty list hides the line.
window.SV_STACK = ["swift", "swiftui", "appkit", "c", "shell", "javascript", "three.js", "glsl", "github actions"];
