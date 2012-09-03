# the Soundcloud specific Code
# nothing fancy hier :)

# the App ID 
APPID = '829b2b95de282fa7cf7297e7ab2960ed'
# initialize Soundcloud with the appropriate callback
SC.initialize 
	client_id: APPID
	redirect_uri: "http://clouddj.herokuapp.com/static/callback.html"
# the user Object
User = {}


# Connect to SoundCloud
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
# disconnect from SoundCloud
$('#user').on 'click', '.disconnect', ()->
	$('#connect').removeClass('disconnect').addClass('connect')
	$('#message').text ""
	$('#tabs').fadeOut()
	User = {} 
