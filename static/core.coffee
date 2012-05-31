APPID = '829b2b95de282fa7cf7297e7ab2960ed'
context = new webkitAudioContext()

filters = [
	"static/impulse-responses/matrix-reverb3.wav"
	"static/impulse-responses/wildecho.wav"
	"static/impulse-responses/cosmic-ping-long.wav"
]

filterBuffers = []

getBuffer = (url, callback)->
	request = new XMLHttpRequest
	request.open "GET", url , true
	request.responseType = "arraybuffer"
	request.onload = ()->
		buffer = context.createBuffer request.response, false
		callback buffer
	request.send()

do ()->
	for filter in filters
		getBuffer filter, (buffer)->
			filterBuffers.push buffer

class Track extends Spine.Model
	@configure "Track", "sc", "buffer"


class Deck extends Spine.Controller

	events:
		'click .cover' : 'togglePlay'
		'change .tempo' : 'updateTempo'
		'click .filters button' : 'toggleFilter'
		'change .effect' : 'effectVolume'
		'click .player' : 'jumpTo'

	elements:
		'.tempo' : 'tempo'
		'.player': 'player'
		'.cover' : 'cover'
		'.effect' : 'effect'
		'.playhead' : 'cursor'

	constructor: ->
		super
		@gainNode = context.createGainNode()
		@convolver = context.createConvolver()
		@convolverGain = context.createGainNode()
		@convolverGain.gain.value = 0
		@playing = false

	loadTrack: (track)=>
		@track = track
		@source?.noteOff(0)
		@player.css  'background-color' : 'white'
		@player.css 'background-image' : "url(#{@track.sc.waveform_url})"
		@cover.attr 'src', @track.sc.artwork_url
		if not @track.buffer
			url = track.sc.stream_url+"?client_id=#{APPID}"
			getBuffer '/stream?url='+escape(url), (buffer)=>
				@track.buffer = buffer
				@path = @track.buffer.duration/400
				@track.save()
				@player.css  'background-color' : '#5C5CD6'
				console.log "Track loaded"
		else
			@player.css  'background-color' : '#5C5CD6'
			@path = @track.buffer.duration/400

	togglePlay: ()->
		if @playing then @pause() else @play()

	play: (startAt= @track.pausedAt) ->
		@source = context.createBufferSource()
		@source.buffer = @track.buffer
		#@gainNode = context.createGainNode()
		@source.connect @gainNode
		@source.connect @convolver
		@convolver.connect @convolverGain
		@convolverGain.connect @gainNode
		@gainNode.connect context.destination
		@track.startedAt = Date.now()
		if startAt
			@track.pausedAt = startAt
			@source.noteGrainOn 0, startAt, @source.buffer.duration - startAt
		else 
			@track.pausedAt = 0
			@source.noteOn(0)

		@track.save()
		@playing = true
		@updateTempo()


	pause: ->
		@track.pausedAt += (Date.now() - @track.startedAt) / 1000 
		@track.save()
		@source.noteOff(0)
		@playing = false
		clearInterval @updater

	jumpTo: (e)->
		if @playing
			@pause()
			@play e.offsetX*@path
		else
			@track.pausedAt = e.offsetX*@path

		@updateCursor e.offsetX


	updateCursor: (px)=>
		if px
			@cursor.css 'width', px

		@cursor.css 'width', '+=1'

	updateTempo: ->
		val = ((@tempo.val()-50)/200) + 1
		@source.playbackRate.value = val
		if @updater then clearInterval @updater
		@updater = setInterval @updateCursor, (@path*1000)/val

	toggleFilter: (e)->
		filter = parseInt($(e.target).text())
		@convolver.buffer = filterBuffers[filter-1]

	effectVolume: ->
		@convolverGain.gain.value = @effect.val()/100


deckA = new Deck(el : $('#deck-a'))
deckB = new Deck(el : $('#deck-b'))


class Playlist extends Spine.Controller
	
	el: $('#playlist-container')

	elements: 
		'#playlist' : 'playlist'

	events: 
		'click #add' : 'addSound'

	addSound : ()->
		url = @$('#url').val()
		$.get "http://api.soundcloud.com/resolve.json?url=#{url}&client_id=#{APPID}", (data)=>
			track = Track.create(sc : data)
			track.save()
			item = new Item(item : track)
			@playlist.append(item.render().el)

class Item extends Spine.Controller

	tag: 'li'

	events:
		'click .load-a' : 'loadA'
		'click .load-b' : 'loadB'

	constructor : ->
		super

	render: ->
		title = "#{@item.sc.user.username} - #{@item.sc.title}"
		src = @item.sc.artwork_url
		@el.html $('#itemTemplate').tmpl(src: src, title: title)
		@

	loadA: ->
		deckA.loadTrack(@item)

	loadB: ->
		deckB.loadTrack(@item)


playlist = new Playlist

crossfade = (element)->
	x = parseInt(element.value) / parseInt(element.max)
	gain1 = Math.cos(x * 0.5*Math.PI)
	gain2 = Math.cos((1.0 - x) * 0.5*Math.PI)
	deckA.gainNode.gain.value = gain1;
	deckB.gainNode.gain.value = gain2;



