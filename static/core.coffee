APPID = '829b2b95de282fa7cf7297e7ab2960ed'
SC.initialize 
	client_id: APPID
	redirect_uri: "http://clouddj.herokuapp.com/static/callback.html"
context = new webkitAudioContext()

User = {} 

filters = [
	"static/impulse-responses/matrix-reverb3.wav"
	"static/impulse-responses/echo.wav"
	"static/impulse-responses/cosmic-ping-long.wav"
]

filterBuffers = []

getBuffer = (url, progress, callback)->
	request = new XMLHttpRequest
	request.open "GET", url , true
	request.responseType = "arraybuffer"
	request.onprogress = progress
	request.onload = ()->
		context.decodeAudioData request.response, (buffer)->
			callback buffer
	request.send()

do ()->
	for filter in filters
		getBuffer filter,
			(e)-> false, 
			(buffer)-> filterBuffers.push buffer

class Track extends Spine.Model
	@configure "Track", "sc", "buffer", "title", "local", "cover"
	@extend Spine.Model.Local


class Deck extends Spine.Controller

	events:
		'click .cover' : 'togglePlay'
		'change .tempo' : 'updateTempo'
		'click .filters .filter' : 'toggleFilter'
		'change .effect' : 'effectVolume'
		'click .player' : 'jumpTo'

	elements:
		'.tempo' : 'tempoRange'
		'.player': 'player'
		'.cover' : 'cover'
		'.effect' : 'effect'
		'.waveform' : 'waveform'

	constructor: ->
		super
		@gainNode = context.createGainNode()
		@analyser = context.createAnalyser()
		@convolver = context.createConvolver()
		@convolverGain = context.createGainNode()
		@convolverGain.gain.value = 0
		@playing = false
		##canvas stuff
		@waveCtx = @waveform[0].getContext('2d')
		@playerCtx = @player[0].getContext('2d')
		@image = new Image()
		@image.onload = ()=> 
			@drawWave 225
			@drawCursor 0

	loadTrack: (track)=>
		@track = track
		@track.bind 'destroy', @unloadTrack
		@source?.noteOff(0)
		@el.addClass 'buffering'
		@image.src = @track.sc?.waveform_url or '/static/images/waveform.png'
		@cover.css 'background-image', "url(#{@track.cover})"
		if not @track.buffer
			if @track.local
				context.decodeAudioData @track.data, (buffer)=>
					@track.buffer = buffer
					delete @track.data
					@path = @track.buffer.duration/550
					@wavePath =  @track.buffer.duration/3000
					@track.save
					@el.removeClass 'buffering'
			else
				url = track.sc.stream_url+"?client_id=#{APPID}"
				getBuffer '/stream?url='+escape(url),
					(ev) => @drawCursor ((ev.loaded/ev.total)*550),
					(buffer)=>
						@track.buffer = buffer
						@path = @track.buffer.duration/550
						@wavePath =  @track.buffer.duration/3000
						@track.save()
						@el.removeClass 'buffering'
		else
			@el.removeClass 'buffering'
			@path = @track.buffer.duration/550
			@wavePath =  @track.buffer.duration/3000
			@drawCursor 0

	unloadTrack: ()=>
		@pause() if @playing
		@track = ''
		@drawCursor 0

	togglePlay: ()->
		if @playing then @pause() else @play()

	play: (startAt= @track.pausedAt) ->
		if @track?.buffer
			@source = context.createBufferSource()
			@source.buffer = @track.buffer
			@source.connect @analyser
			@analyser.connect @gainNode
			@source.connect @convolver
			@convolverGain.connect @gainNode
			@gainNode.connect context.destination
			@track.startedAt = Date.now()
			if startAt
				@track.pausedAt = startAt
				@source.noteGrainOn 0, startAt, @source.buffer.duration - startAt
			else 
				@track.pausedAt = 0
				@source.noteOn(0)

			@playing = true
			@updateTempo()
			@updateAnimations()
			@track.save()

	pause: ->
		@track.pausedAt += (Date.now() - @track.startedAt) / 1000
		@track.save()
		@source.noteOff(0)
		@playing = false
		window.webkitCancelRequestAnimationFrame @animation

	jumpTo: (e)->
		if @playing
			@pause()
			@play e.offsetX*@path
		else
			@track.pausedAt = e.offsetX*@path

		@track.save()
		@updateCursor e.offsetX
		@updateWave @track.pausedAt/@wavePath

	updateCursor: (px)=>
		if px >= 550
			window.webkitCancelRequestAnimationFrame @animation 
		else
			@drawCursor px

	drawCursor: (px)->
		@playerCtx.clearRect 0, 0, 550, 50
		#player
		playerGradient = @playerCtx.createLinearGradient 0, 0, 550, 50
		playerGradient.addColorStop 0, "#c586e8"
		playerGradient.addColorStop 1, "#6343f2"
		@playerCtx.fillStyle = playerGradient
		@playerCtx.fillRect 0, 0, 550, 50
		@playerCtx.drawImage @image, 0, 0, 550, 50
		#cursor
		@playerCtx.fillStyle = "rgba(0, 0, 255, 0.2)"
		@playerCtx.fillRect 0, 0, px, 50

	updateWave: (px)=>
		wavePos = 225-px
		if  wavePos >= -2775
			@drawWave wavePos 
		else
			window.webkitCancelRequestAnimationFrame @animation

	drawWave: (dx)->
		@waveCtx.clearRect 0, 0, 450, 100
		#wave
		waveGradient = @waveCtx.createLinearGradient dx, 0, 3000+dx, 100
		waveGradient.addColorStop 0, "#84d1f4"
		waveGradient.addColorStop 0.5, "#2d74e5"
		waveGradient.addColorStop 1, "#f24bef"
		@waveCtx.fillStyle = waveGradient
		@waveCtx.fillRect 0, 0, 450, 100
		@waveCtx.drawImage @image, dx, 0, 3000, 100
		#the ruler
		@waveCtx.beginPath()
		@waveCtx.lineWidth = 1
		@waveCtx.strokeStyle = "rgba(0, 0, 255, 0.5)"
		@waveCtx.moveTo(0,49)
		@waveCtx.lineTo(450,49)
		@waveCtx.stroke()
		#the bar
		@waveCtx.beginPath()
		@waveCtx.lineWidth = 2
		@waveCtx.strokeStyle = "rgba(255, 0, 0, 0.5)"
		@waveCtx.moveTo(225,0)
		@waveCtx.lineTo(225,100)
		@waveCtx.stroke()

	updateAnimations: ()=>
		@animation = window.webkitRequestAnimationFrame @updateAnimations
		#render
		@track.currentTime = (Date.now() - @track.startedAt)/1000 + @track.pausedAt
		@updateWave Math.floor(@track.currentTime/@wavePath)
		@updateCursor Math.floor(@track.currentTime/@path)

	updateTempo: ->
		@tempo = ((@tempoRange.val()-50)/400) + 1
		@source.playbackRate.value = @tempo


	toggleFilter: (e)->
		elem = $(e.target)
		current = parseInt elem.attr('filter')
		if @lastFilter and @lastFilter is current
			elem.removeClass 'active'
			@convolver.disconnect(0)
			@lastFilter = ''
		else 
			@convolver.connect @convolverGain unless @lastFilter
			@lastFilter = current
			@convolver.buffer = filterBuffers[@lastFilter-1]
			$('.filters .filter').removeClass 'active'
			elem.addClass 'active'

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

	constructor: ->
		super
		Track.bind 'create', @renderOne
		Track.bind 'refresh', @render
		Track.fetch()

	render: =>
		for track in Track.all()
			if not track.local
				track.buffer = ""
				track.save()
				@renderOne track

	renderOne: (track)=>
		item = new Item(item : track)
		@playlist.append(item.render().el)

	addSound : ()->
		url = @$('#url').val()
		$.get "http://api.soundcloud.com/resolve.json?url=#{url}&client_id=#{APPID}", (data)=>
			track = Track.create(sc : data)
			track.cover = data.sc.artwork_url or "/static/images/logo.png"
			track.save()

	loadFile: (e)->
		e.stopPropagation()
		e.preventDefault()
		files = e.dataTransfer.files
		tracks = []
		reader = new FileReader()
		reader.onload = (fileEvent)->
			track = tracks.shift()
			track.data = fileEvent.target.result
			track.save

		for file in files
			console.log file.type
			if file.type.slice(0,-4) is "audio"
				track = Track.create(title : file.name.slice(0,-4), local : true, cover: "/static/images/logo.png")
				tracks.push track
				reader.readAsArrayBuffer file			

class Item extends Spine.Controller

	tag: 'li'

	events:
		'click .load-a' : 'loadA'
		'click .load-b' : 'loadB'
		'click .delete' : 'delete'

	constructor : ->
		super

	render: ->
		title = @item.title or "#{@item.sc.user.username} - #{@item.sc.title}"
		@el.html $('#listItemTemplate').tmpl(src: @item.cover, title: title)
		@

	loadA: ->
		deckA.loadTrack(@item)

	loadB: ->
		deckB.loadTrack(@item)

	delete: ->
		@item.destroy()
		@release()

class searchList extends Spine.Controller

	el: $('#search-container')

	events:
		'keydown #searchField' : 'search'
		'click #search' : 'renderSearch'
		'click #favs' : 'renderFavs'
		'click #tracks' : 'renderTracks'

	elements:
		'#searchlist' : 'searchlist'
		'#searchField' : 'query'

	constructor : ->
		super
		@tab = 'sc'

	search: ()->
		@searchlist.empty()
		searchString = @query.val().toLowerCase()
		if @tab is 'sc'
			SC.get '/tracks', q: searchString, (result)=>
				for track in result[0..10]
					@renderOne track
		else if @tab is 'favs'
			for track in User.favs
				if track.user.username.toLowerCase().indexOf(searchString) isnt -1 or track.title.toLowerCase().indexOf(searchString) isnt -1
					@renderOne track
		else 
			for track in User.tracks
				if track.user.username.toLowerCase().indexOf(searchString) isnt -1 or track.title.toLowerCase().indexOf(searchString) isnt -1
					@renderOne track

	renderSearch: ()->
		@searchlist.empty()
		@tab = 'sc'
		@query.attr 'placeholder', 'search Soundcloud'

	renderFavs: ()->
		@query.attr 'placeholder', 'search your favorites'
		@tab = 'favs'
		@searchlist.empty()
		for track in User.favs
			@renderOne track

	renderTracks: ()->
		@query.attr 'placeholder', 'search your tracks'
		@tab = 'tracks'
		@searchlist.empty()
		for track in User.tracks
			@renderOne track

	renderOne: (track)->
		item = new searchItem(item : track)
		@searchlist.append(item.render().el)

class searchItem extends Spine.Controller

	tag: 'li'

	events:
		'click .add-list' : 'addToList'

	render: ->
		title = "#{@item.user.username} - #{@item.title}"
		src = @item.artwork_url or '/static/images/logo.png'
		@el.html $('#searchItemTemplate').tmpl(src: src, title: title)
		@

	addToList: ->
		track = Track.create(sc : @item)
		track.cover = @item.artwork_url or "/static/images/logo.png"
		track.save()
		#playlist.renderOne(sc : @item)


searchlist = new searchList
playlist = new Playlist



crossfade = (element)->
	x = parseInt(element.value) / parseInt(element.max)
	gain1 = Math.cos(x * 0.5*Math.PI)
	gain2 = Math.cos((1.0 - x) * 0.5*Math.PI)
	deckA.gainNode.gain.value = gain1;
	deckB.gainNode.gain.value = gain2;

#Connect to SoundCloud
$('#user').on 'click','.connect', ()->
	$('#connect').removeClass('connect').addClass('disconnect')
	$('#tabs').fadeIn()
	SC.connect ()->
		SC.get '/me', (me)->
			User = me
			$('#message').text "Welcome #{me.username}"
		SC.get '/me/favorites', (favs)->
			User.favs = favs
		SC.get '/me/tracks', (tracks)->
			User.tracks = tracks

$('#user').on 'click', '.disconnect', ()->
	$('#connect').removeClass('disconnect').addClass('connect')
	$('#message').text ""
	$('#tabs').fadeOut()
	User = {}

#drag and drop files
document.addEventListener 'drop', playlist.loadFile, false
document.addEventListener 'dragover',
	(e)->
		e.stopPropagation()
		e.preventDefault()
		false
	,false



