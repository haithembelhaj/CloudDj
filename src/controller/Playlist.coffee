# The playlist Logic
# add an remove Items from Playlist
class Playlist extends Spine.Controller
	# The Playlist Controller
	
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
			if file.type.slice(0,-4) is "audio"
				track = Track.create(title : file.name.slice(0,-4), local : true, cover: "/static/images/logo.png")
				tracks.push track
				reader.readAsArrayBuffer file	


class Item extends Spine.Controller
	# The Item Controller

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
