# The Audio specific Code with some Helper

# the Audio Context 
# TODO make it Cross Browser
context = new webkitAudioContext()

# Audio Settings 
SAMPLE_SIZE = 2048
SAMPLE_RATE = 44100

# The Audio Filters
filters = [
	"static/impulse-responses/matrix-reverb3.wav"
	"static/impulse-responses/echo.wav"
	"static/impulse-responses/cosmic-ping-long.wav"
]

filterBuffers = []

# Concat twoflat32 Arrays
float32Concat = (first, second)->
	length = first.length
	result = new Float32Array(length+1024)
	result.set first
	result.set second, length
	result

# Gets the Audio buffer of a given URL
getBuffer = (url, progress, callback)->
	request = new XMLHttpRequest
	request.open "GET", url , true
	request.responseType = "arraybuffer"
	request.onprogress = progress
	request.onload = ()->
		context.decodeAudioData request.response, (buffer)->
			callback buffer
	request.send()

# Preload the Filters
do ()->
	for filter in filters
		getBuffer filter,
			(e)-> false, 
			(buffer)-> filterBuffers.push buffer

# The Crossfader
crossfade = (element)->
	x = parseInt(element.value) / parseInt(element.max)
	gain1 = Math.cos(x * 0.5*Math.PI)
	gain2 = Math.cos((1.0 - x) * 0.5*Math.PI)
	deckA.gainNode.gain.value = gain1;
	deckB.gainNode.gain.value = gain2;
