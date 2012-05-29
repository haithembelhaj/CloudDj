var APPID, Deck, Item, Playlist, Track, context, crossfade, deckA, deckB, filterBuffers, filters, getBuffer, playlist,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

APPID = '829b2b95de282fa7cf7297e7ab2960ed';

context = new webkitAudioContext();

filters = ["static/impulse-responses/matrix-reverb3.wav", "static/impulse-responses/wildecho.wav", "static/impulse-responses/cosmic-ping-long.wav"];

filterBuffers = [];

getBuffer = function(url, callback) {
  var request;
  request = new XMLHttpRequest;
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  request.onload = function() {
    var buffer;
    buffer = context.createBuffer(request.response, false);
    return callback(buffer);
  };
  return request.send();
};

(function() {
  var filter, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = filters.length; _i < _len; _i++) {
    filter = filters[_i];
    _results.push(getBuffer(filter, function(buffer) {
      return filterBuffers.push(buffer);
    }));
  }
  return _results;
})();

Track = (function(_super) {

  __extends(Track, _super);

  function Track() {
    Track.__super__.constructor.apply(this, arguments);
  }

  Track.configure("Track", "sc", "buffer");

  return Track;

})(Spine.Model);

Deck = (function(_super) {

  __extends(Deck, _super);

  Deck.prototype.events = {
    'click .cover': 'togglePlay',
    'change .tempo': 'changeTempo',
    'click .filters button': 'toggleFilter',
    'change .effect': 'effectVolume'
  };

  Deck.prototype.elements = {
    '.tempo': 'tempo',
    '.player': 'player',
    '.cover': 'cover',
    '.effect': 'effect'
  };

  function Deck() {
    this.loadTrack = __bind(this.loadTrack, this);    Deck.__super__.constructor.apply(this, arguments);
    this.gainNode = context.createGainNode();
    this.convolver = context.createConvolver();
    this.convolverGain = context.createGainNode();
    this.convolverGain.gain.value = 0;
    this.playing = false;
  }

  Deck.prototype.loadTrack = function(track) {
    var url, _ref,
      _this = this;
    this.track = track;
    if ((_ref = this.source) != null) _ref.noteOff(0);
    this.player.css({
      'background-color': 'white'
    });
    this.player.css({
      'background-image': "url(" + this.track.sc.waveform_url + ")"
    });
    this.cover.attr('src', this.track.sc.artwork_url);
    if (!this.track.buffer) {
      url = track.sc.stream_url + ("?client_id=" + APPID);
      return getBuffer('/stream?url=' + escape(url), function(buffer) {
        _this.track.buffer = buffer;
        _this.track.save();
        _this.player.css({
          'background-color': 'blue'
        });
        return console.log("Track loaded");
      });
    } else {
      return this.player.css({
        'background-color': 'blue'
      });
    }
  };

  Deck.prototype.togglePlay = function() {
    if (this.playing) {
      this.source.noteOff(0);
    } else {
      this.play();
    }
    return this.playing = !this.playing;
  };

  Deck.prototype.play = function() {
    this.source = context.createBufferSource();
    this.source.connect(this.gainNode);
    this.source.connect(this.convolver);
    this.convolver.connect(this.convolverGain);
    this.convolverGain.connect(this.gainNode);
    this.gainNode.connect(context.destination);
    this.source.buffer = this.track.buffer;
    return this.source.noteOn(0);
  };

  Deck.prototype.changeTempo = function() {
    var val;
    val = ((this.tempo.val() - 50) / 200) + 1;
    return this.source.playbackRate.value = val;
  };

  Deck.prototype.toggleFilter = function(e) {
    var filter;
    filter = parseInt($(e.target).text());
    return this.convolver.buffer = filterBuffers[filter - 1];
  };

  Deck.prototype.effectVolume = function() {
    return this.convolverGain.gain.value = this.effect.val() / 100;
  };

  return Deck;

})(Spine.Controller);

deckA = new Deck({
  el: $('#deck-a')
});

deckB = new Deck({
  el: $('#deck-b')
});

Playlist = (function(_super) {

  __extends(Playlist, _super);

  function Playlist() {
    Playlist.__super__.constructor.apply(this, arguments);
  }

  Playlist.prototype.el = $('#playlist-container');

  Playlist.prototype.elements = {
    '#playlist': 'playlist'
  };

  Playlist.prototype.events = {
    'click #add': 'addSound'
  };

  Playlist.prototype.addSound = function() {
    var url,
      _this = this;
    url = this.$('#url').val();
    return $.get("http://api.soundcloud.com/resolve.json?url=" + url + "&client_id=" + APPID, function(data) {
      var item, track;
      track = Track.create({
        sc: data
      });
      track.save();
      item = new Item({
        item: track
      });
      return _this.playlist.append(item.render().el);
    });
  };

  return Playlist;

})(Spine.Controller);

Item = (function(_super) {

  __extends(Item, _super);

  Item.prototype.tag = 'li';

  Item.prototype.events = {
    'click .load-a': 'loadA',
    'click .load-b': 'loadB'
  };

  function Item() {
    Item.__super__.constructor.apply(this, arguments);
  }

  Item.prototype.render = function() {
    var src, title;
    title = "" + this.item.sc.user.username + " - " + this.item.sc.title;
    src = this.item.sc.artwork_url;
    this.el.html($('#itemTemplate').tmpl({
      src: src,
      title: title
    }));
    return this;
  };

  Item.prototype.loadA = function() {
    return deckA.loadTrack(this.item);
  };

  Item.prototype.loadB = function() {
    return deckB.loadTrack(this.item);
  };

  return Item;

})(Spine.Controller);

playlist = new Playlist;

crossfade = function(element) {
  var gain1, gain2, x;
  x = parseInt(element.value) / parseInt(element.max);
  gain1 = Math.cos(x * 0.5 * Math.PI);
  gain2 = Math.cos((1.0 - x) * 0.5 * Math.PI);
  deckA.gainNode.gain.value = gain1;
  return deckB.gainNode.gain.value = gain2;
};
