APPID = '829b2b95de282fa7cf7297e7ab2960ed'
SC.initialize client_id: APPID
context = new webkitAudioContext()

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
		'.playhead' : 'cursor'
		'.waveform' : 'waveform'

	constructor: ->
		super
		@gainNode = context.createGainNode()
		@convolver = context.createConvolver()
		@convolverGain = context.createGainNode()
		@convolverGain.gain.value = 0
		@playing = false
		Track.bind 'destroy', @unloadTrack
		##canvas stuff
		@context = @waveform[0].getContext('2d')
		@image = new Image()
		@wavePos = 255
		@image.onload = ()=> @drawWave 255

	loadTrack: (track)=>
		@track = track
		@source?.noteOff(0)
		@el.addClass 'buffering'
		@player.css 'background-image' : "url(#{@track.sc.waveform_url}), -webkit-gradient(linear, left top, right top, color-stop(0%,#c586e8), color-stop(100%,#6343f2))"
		#@waveform.css 'background-image' : "url(#{@track.sc.waveform_url}),-webkit-gradient(linear, left top, right top, color-stop(1%,#84d1f4), color-stop(49%,#2d74e5), color-stop(99%,#f24bef))"
		@image.src = @track.sc.waveform_url
		@cover.css 'background-image', "url(#{@track.sc.artwork_url})"
		if not @track.buffer
			url = track.sc.stream_url+"?client_id=#{APPID}"
			getBuffer '/stream?url='+escape(url),
				(ev) => @cursor.width ((ev.loaded/ev.total)*100)+"%",
				(buffer)=>
					@track.buffer = buffer
					@path = @track.buffer.duration/550
					@wavePath =  @track.buffer.duration/3000
					@track.save()
					@cursor.width 0
					@el.removeClass 'buffering'
		else
			@el.removeClass 'buffering'
			@path = @track.buffer.duration/550
			@wavePath =  @track.buffer.duration/3000

	unloadTrack: ()=>
		@pause() if @playing
		@track = ''
		@player.css 'background-image' : "none"
		#@waveform.css 'background-image' : "none"
		@cover.attr 'src', ''
		@cursor.width 0

	togglePlay: ()->
		if @playing then @pause() else @play()

	play: (startAt= @track.pausedAt) ->
		if @track?.buffer
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
			@cursor.width px
		if @cursor.width() >= 550
			clearInterval @updater 
		else
			@cursor.width (i,w)-> w+2

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
		@context.clearRect 0, 0, 3000, 99
		#wave
		waveGradient = @context.createLinearGradient dx, 0, 3000+dx, 99
		waveGradient.addColorStop 0, "#84d1f4"
		waveGradient.addColorStop 0.5, "#2d74e5"
		waveGradient.addColorStop 1, "#f24bef"
		@context.fillStyle = waveGradient
		@context.fillRect dx, 0, 3000, 99
		@context.drawImage @image, dx, 0, 3000, 99
		#the ruler
		@context.beginPath()
		@context.lineWidth = 1
		@context.strokeStyle = "rgba(0, 0, 255, 0.2)"
		@context.moveTo(0,49)
		@context.lineTo(450,49)
		@context.stroke()
		#the bar
		@context.beginPath()
		@context.lineWidth = 2
		@context.strokeStyle = "rgba(255, 0, 0, 0.5)"
		@context.moveTo(254,0)
		@context.lineTo(254,99)
		@context.stroke()

	updateTempo: ->
		val = ((@tempo.val()-50)/200) + 1
		
		@source.playbackRate.value = val
		if @updater then clearInterval @updater
		@updater = setInterval @updateCursor, (@path*1000)*2/val

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
		'keydown #search' : 'render'

	elements:
		'#searchlist' : 'searchlist'
		'#search' : 'query'

	constructor : ->
		super

	render: ()->
		@searchlist.empty()
		SC.get '/tracks', q: @query.val(), (result)=>
			for track in result[0..10]
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



