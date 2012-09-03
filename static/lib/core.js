var crossfade, deckA, deckB, playlist, searchlist;

deckA = new Deck({
  el: $('#deck-a')
});

deckB = new Deck({
  el: $('#deck-b')
});

searchlist = new Searchlist;

playlist = new Playlist;

crossfade = function(element) {
  var gain1, gain2, x;
  x = parseInt(element.value) / parseInt(element.max);
  gain1 = Math.cos(x * 0.5 * Math.PI);
  gain2 = Math.cos((1.0 - x) * 0.5 * Math.PI);
  deckA.gainNode.gain.value = gain1;
  return deckB.gainNode.gain.value = gain2;
};

document.addEventListener('drop', playlist.loadFile, false);

document.addEventListener('dragover', function(e) {
  e.stopPropagation();
  e.preventDefault();
  return false;
}, false);
