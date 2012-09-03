var APPID, User;

APPID = '829b2b95de282fa7cf7297e7ab2960ed';

SC.initialize({
  client_id: APPID,
  redirect_uri: "http://clouddj.herokuapp.com/static/callback.html"
});

User = {};

$('#user').on('click', '.connect', function() {
  $('#connect').removeClass('connect').addClass('disconnect');
  $('#tabs').fadeIn();
  return SC.connect(function() {
    SC.get('/me', function(me) {
      User = me;
      return $('#message').text("Welcome " + me.username);
    });
    SC.get('/me/favorites', function(favs) {
      return User.favs = favs;
    });
    return SC.get('/me/tracks', function(tracks) {
      return User.tracks = tracks;
    });
  });
});

$('#user').on('click', '.disconnect', function() {
  $('#connect').removeClass('disconnect').addClass('connect');
  $('#message').text("");
  $('#tabs').fadeOut();
  return User = {};
});
