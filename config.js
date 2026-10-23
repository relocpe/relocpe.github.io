// Discord user id for the live Lanyard presence (https://github.com/Phineas/lanyard)
const DISCORD_ID = "1095706197081993279";
window.SV_DISCORD_ID = DISCORD_ID;

// Background videos: one is picked at random on every page load (with its poster).
// tools/add-video.sh encodes a file and rewrites this list. srcSmall (optional) = 720p copy for phones / data-saver. Keep each well under 100 MB (GitHub Pages).
window.SV_VIDEOS = [
  // { src: "bg.mp4", poster: "poster.jpg" },   // SLAVE - LAST SUMMER (removed by user)
  // { src: "bg2.mp4", poster: "poster2.jpg" },   // removed by user
  { src: "bg3.mp4", srcSmall: "bg3-720.mp4", poster: "poster3.jpg" },   // SLAVE - LA, 1080p master (phones get the 720p file)
];
