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
		buffer = context.createBuffer request.response, false
		callback buffer
	request.send()

do ()->
	for filter in filters
		getBuffer filter,
			(e)-> false, 
			(buffer)-> filterBuffers.push buffer

class Track extends Spine.Model
	@configure "Track", "sc", "buffer"
	@extend Spine.Model.Local


class Deck extends Spine.Controller

	events:
		'click .cover' : 'togglePlay'
		'change .tempo' : 'updateTempo'
		'click .filters .filter' : 'toggleFilter'
		'change .effect' : 'effectVolume'
		'click .player' : 'jumpTo'

	elements:
		'.tempo' : 'tempo'
		'.player': 'player'
		'.cover' : 'cover'
		'.effect' : 'effect'
		'.waveform' : 'waveform'

	constructor: ->
		super
		@gainNode = context.createGainNode()
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
		@wavePos = 225
		@playerPos = 0
		@el.addClass 'buffering'
		@image.src = @track.sc.waveform_url
		@cover.css 'background-image', "url(#{@track.sc.artwork_url})"
		if not @track.buffer
			url = track.sc.stream_url+"?client_id=#{APPID}"
			getBuffer '/stream?url='+escape(url),
				(ev) => @drawCursor ((ev.loaded/ev.total)*550),
				(buffer)=>
					@track.buffer = buffer
					@path = @track.buffer.duration/550
					@wavePath =  @track.buffer.duration/3000
					@track.save()
					@el.removeClass 'buffering'
					@drawCursor 0
		else
			@el.removeClass 'buffering'
			@path = @track.buffer.duration/550
			@wavePath =  @track.buffer.duration/3000

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
			#@gainNode = context.createGainNode()
			@source.connect @gainNode
			@source.connect @convolver
			#@convolver.connect @convolverGain
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
		clearInterval @waver

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
		if px
			@playerPos = px
			@drawCursor @playerPos

		if @playerPos >= 550
			clearInterval @updater 
		else
			@playerPos++
			@drawCursor @playerPos

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
		if px
			@wavePos = 225-px
			@drawWave @wavePos 
		@wavePos--
		if  @wavePos >= -2776
			@drawWave @wavePos 
		else
			clearInterval @waver

	drawWave: (dx)->
		@waveCtx.clearRect 0, 0, 3000, 99
		#wave
		waveGradient = @waveCtx.createLinearGradient dx, 0, 3000+dx, 99
		waveGradient.addColorStop 0, "#84d1f4"
		waveGradient.addColorStop 0.5, "#2d74e5"
		waveGradient.addColorStop 1, "#f24bef"
		@waveCtx.fillStyle = waveGradient
		@waveCtx.fillRect dx, 0, 3000, 99
		@waveCtx.drawImage @image, dx, 0, 3000, 99
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
		@waveCtx.lineTo(225,99)
		@waveCtx.stroke()

	updateTempo: ->
		val = ((@tempo.val()-50)/200) + 1
		
		@source.playbackRate.value = val
		if @updater then clearInterval @updater
		@updater = setInterval @updateCursor, (@path*1000)/val

		if @waver then clearInterval @waver
		@waver = setInterval @updateWave, (@wavePath*1000)/val


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
			track.save()
			

class Item extends Spine.Controller

	tag: 'li'

	events:
		'click .load-a' : 'loadA'
		'click .load-b' : 'loadB'
		'click .delete' : 'delete'

	constructor : ->
		super

	render: ->
		title = "#{@item.sc.user.username} - #{@item.sc.title}"
		src = @item.sc.artwork_url
		@el.html $('#listItemTemplate').tmpl(src: src, title: title)
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
		'keydown #searchField' : 'renderSearch'
		'click #search' : 'renderSearch'
		'click #favs' : 'renderFavs'
		'click #tracks' : 'renderTracks'

	elements:
		'#searchlist' : 'searchlist'
		'#search' : 'query'

	constructor : ->
		super

	renderSearch: ()->
		@searchlist.empty()
		SC.get '/tracks', q: @query.val(), (result)=>
			for track in result[0..10]
				@renderOne track

	renderFavs: ()->
		@searchlist.empty()
		for track in User.favs
			@renderOne track

	renderTracks: ()->
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
		src = @item.artwork_url
		@el.html $('#searchItemTemplate').tmpl(src: src, title: title)
		@

	addToList: ->
		track = Track.create(sc : @item)
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
$('user').on('#connect.connect').click ()->
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

$('user').on('#connect.disconnect').click ()->
	$('#connect').removeClass('disconnect').addClass('connect')
	$('#message').text ""
	$('#tabs').fadeOut()
	User = {}



