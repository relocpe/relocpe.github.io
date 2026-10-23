// Discord user id for the live Lanyard presence (https://github.com/Phineas/lanyard)
const DISCORD_ID = "1095706197081993279";
window.SV_DISCORD_ID = DISCORD_ID;

// Background videos: one is picked at random on every page load (with its poster).
// Add a file with tools/add-video.sh, then list it here. Keep each well under 100 MB (GitHub Pages).
window.SV_VIDEOS = [
  { src: "bg.mp4", poster: "poster.jpg" },   // SLAVE - LAST SUMMER
  { src: "bg2.mp4", poster: "poster2.jpg" },   // user-supplied file (116s)
  { src: "bg3.mp4", poster: "poster3.jpg" },   // user-supplied file
];
