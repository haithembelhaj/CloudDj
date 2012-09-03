
class Searchlist extends Spine.Controller

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
		cover = @item.artwork_url or "/static/images/logo.png"
		track = Track.create(sc : @item, cover : cover)
		track.save()
		#playlist.renderOne(sc : @item)