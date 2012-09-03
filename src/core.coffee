# The Core Functionality of CloudDj

# Init the Controllers
deckA = new Deck(el : $('#deck-a'))
deckB = new Deck(el : $('#deck-b'))		
searchlist = new Searchlist
playlist = new Playlist

# The Crossfader
crossfade = (element)->
	x = parseInt(element.value) / parseInt(element.max)
	gain1 = Math.cos(x * 0.5*Math.PI)
	gain2 = Math.cos((1.0 - x) * 0.5*Math.PI)
	deckA.gainNode.gain.value = gain1;
	deckB.gainNode.gain.value = gain2;

#drag and drop files
document.addEventListener 'drop', playlist.loadFile, false
document.addEventListener 'dragover',
	(e)->
		e.stopPropagation()
		e.preventDefault()
		false
	,false



