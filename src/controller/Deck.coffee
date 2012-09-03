# The Deck Controller 
# Defines All the functionality of a Dj-Deck

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
		'.info' : 'info'

	constructor: ->
		super
		# Beat detector
		@threshold = 0.3
		@currentThreshold = 0.3
		@decay = 0.02
		@beatdetector = new BeatDetektor()
		# nodes
		@gainNode = context.createGainNode()
		# Analyser
		@analyser = context.createAnalyser()
		# FFT
		@jsNode = context.createJavaScriptNode SAMPLE_SIZE/2
		@jsNode.onaudioprocess = (e)=>
			@updateNode e
		@fft = new FFT SAMPLE_SIZE/2, SAMPLE_RATE
		@signal = new Float32Array SAMPLE_SIZE/2
		# Convolver
		@convolver = context.createConvolver()
		@convolverGain = context.createGainNode()
		@convolverGain.gain.value = 0
		@playing = false
		# canvas stuff
		@waveCtx = @waveform[0].getContext('2d')
		@playerCtx = @player[0].getContext('2d')
		@spectrumCtx = $('#spectrum')[0].getContext('2d')
		@image = new Image()
		@image.onload = ()=> 
			@drawWave 225
			@drawCursor 0

	loadTrack: (track)=>
		@track = track
		@track.bind 'change', @updateInfo 
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
					@track.save()
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
		delete @track
		@drawCursor 0

	togglePlay: ()->
		if @playing then @pause() else @play()

	play: (startAt= @track.pausedAt) ->
		if @track?.buffer
			@source = context.createBufferSource()
			@source.buffer = @track.buffer
			@source.connect @analyser
			@analyser.connect @gainNode
			@source.connect @jsNode
			@jsNode.connect context.destination
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

	updateInfo: (track)=>
		currentTime = track.currentTime
		ctmin = Math.floor currentTime / 60
		ctsec = Math.floor currentTime - ctmin * 60
		duration = track.buffer.duration
		dmin = Math.floor duration / 60
		dsec = Math.floor  duration - dmin * 60
		@info.html "#{ctmin}:#{ctsec}/#{dmin}:#{dsec}  BPM:#{track.bpm/10}"

	updateNode: (e)=>
		if !@playing 
			false
		else
			bufferL = e.inputBuffer.getChannelData 0
			bufferR = e.inputBuffer.getChannelData 1 
			@signal = ((bufferL[i] + bufferR[i])/2 for i in [0..(SAMPLE_SIZE/2)-1])
			@fft.forward @signal
			@updateSpectrum()
			@bpm()
			#@detectBeat()
	
	bpm: ()->
		@beatdetector.process @track.getCurrentTime(), @fft.spectrum
		@track.bpm = @beatdetector.win_bpm_int
		@track.save()

	detectBeat: ()->
		magnitude = 0
		for i in [0..10]
			if @fft.spectrum[i] > magnitude then magnitude = @fft.spectrum[i]
		if magnitude >= @threshold and magnitude >= @currentThreshold
			@currentThreshold = magnitude
			#BEAT detected
			@countBeats()
		else
			#DECAY detected
			@currentThreshold -= @decay

	countBeats: ()->
		now = Date.now()
		if not @firstBeat
			@firstBeat = now
			@beats = 1
		else 
			@beats++

		if @beats > 40
			@bpm = (@beats *60000)/ ((now - @firstBeat )* 4)
			console.log @bpm

	updateSpectrum: ()->
		@spectrumCtx.clearRect 0, 0, 256, 50
		@spectrumCtx.fillStyle = "black"
		@spectrumCtx.fillRect(i, 50, 1, -@fft.spectrum[i]*50) for i in [0..256]

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
		@track.save()
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