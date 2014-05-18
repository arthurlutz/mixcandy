// beatClicks.js

document.getElementById('play').onclick = function () {
  song.play();
}
document.getElementById('pause').onclick = function () {
  song.pause();
}
document.getElementById('jump10000').onclick = function () {
  song.pos(position = 10);
}
document.getElementById('jump100000').onclick = function () {
  song.pos(position = 100);
}
