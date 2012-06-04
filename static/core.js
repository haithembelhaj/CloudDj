var APPID, Deck, Item, Playlist, Track, User, context, crossfade, deckA, deckB, filterBuffers, filters, getBuffer, playlist, searchItem, searchList, searchlist,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

APPID = '829b2b95de282fa7cf7297e7ab2960ed';

SC.initialize({
  client_id: APPID,
  redirect_uri: "http://clouddj.herokuapp.com/static/callback.html"
});

context = new webkitAudioContext();

User = {};

filters = ["static/impulse-responses/matrix-reverb3.wav", "static/impulse-responses/echo.wav", "static/impulse-responses/cosmic-ping-long.wav"];

filterBuffers = [];

getBuffer = function(url, progress, callback) {
  var request;
  request = new XMLHttpRequest;
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  request.onprogress = progress;
  request.onload = function() {
    return context.decodeAudioData(request.response, function(buffer) {
      return callback(buffer);
    });
  };
  return request.send();
};

(function() {
  var filter, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = filters.length; _i < _len; _i++) {
    filter = filters[_i];
    _results.push(getBuffer(filter, function(e) {
      return false;
    }, function(buffer) {
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

  Track.configure("Track", "sc", "buffer", "title", "local", "cover");

  Track.extend(Spine.Model.Local);

  return Track;

})(Spine.Model);

Deck = (function(_super) {

  __extends(Deck, _super);

  Deck.prototype.events = {
    'click .cover': 'togglePlay',
    'change .tempo': 'updateTempo',
    'click .filters .filter': 'toggleFilter',
    'change .effect': 'effectVolume',
    'click .player': 'jumpTo'
  };

  Deck.prototype.elements = {
    '.tempo': 'tempoRange',
    '.player': 'player',
    '.cover': 'cover',
    '.effect': 'effect',
    '.waveform': 'waveform'
  };

  function Deck() {
    this.updateAnimations = __bind(this.updateAnimations, this);
    this.updateWave = __bind(this.updateWave, this);
    this.updateCursor = __bind(this.updateCursor, this);
    this.unloadTrack = __bind(this.unloadTrack, this);
    this.loadTrack = __bind(this.loadTrack, this);
    var _this = this;
    Deck.__super__.constructor.apply(this, arguments);
    this.gainNode = context.createGainNode();
    this.analyser = context.createAnalyser();
    this.convolver = context.createConvolver();
    this.convolverGain = context.createGainNode();
    this.convolverGain.gain.value = 0;
    this.playing = false;
    this.waveCtx = this.waveform[0].getContext('2d');
    this.playerCtx = this.player[0].getContext('2d');
    this.image = new Image();
    this.image.onload = function() {
      _this.drawWave(225);
      return _this.drawCursor(0);
    };
  }

  Deck.prototype.loadTrack = function(track) {
    var url, _ref, _ref2,
      _this = this;
    this.track = track;
    this.track.bind('destroy', this.unloadTrack);
    if ((_ref = this.source) != null) _ref.noteOff(0);
    this.el.addClass('buffering');
    this.image.src = ((_ref2 = this.track.sc) != null ? _ref2.waveform_url : void 0) || '/static/images/waveform.png';
    this.cover.css('background-image', "url(" + this.track.cover + ")");
    if (!this.track.buffer) {
      if (this.track.local) {
        return context.decodeAudioData(this.track.data, function(buffer) {
          _this.track.buffer = buffer;
          delete _this.track.data;
          _this.path = _this.track.buffer.duration / 550;
          _this.wavePath = _this.track.buffer.duration / 3000;
          _this.track.save;
          return _this.el.removeClass('buffering');
        });
      } else {
        url = track.sc.stream_url + ("?client_id=" + APPID);
        return getBuffer('/stream?url=' + escape(url), function(ev) {
          return _this.drawCursor((ev.loaded / ev.total) * 550);
        }, function(buffer) {
          _this.track.buffer = buffer;
          _this.path = _this.track.buffer.duration / 550;
          _this.wavePath = _this.track.buffer.duration / 3000;
          _this.track.save();
          return _this.el.removeClass('buffering');
        });
      }
    } else {
      this.el.removeClass('buffering');
      this.path = this.track.buffer.duration / 550;
      this.wavePath = this.track.buffer.duration / 3000;
      return this.drawCursor(0);
    }
  };

  Deck.prototype.unloadTrack = function() {
    if (this.playing) this.pause();
    this.track = '';
    return this.drawCursor(0);
  };

  Deck.prototype.togglePlay = function() {
    if (this.playing) {
      return this.pause();
    } else {
      return this.play();
    }
  };

  Deck.prototype.play = function(startAt) {
    var _ref;
    if (startAt == null) startAt = this.track.pausedAt;
    if ((_ref = this.track) != null ? _ref.buffer : void 0) {
      this.source = context.createBufferSource();
      this.source.buffer = this.track.buffer;
      this.source.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.source.connect(this.convolver);
      this.convolverGain.connect(this.gainNode);
      this.gainNode.connect(context.destination);
      this.track.startedAt = Date.now();
      if (startAt) {
        this.track.pausedAt = startAt;
        this.source.noteGrainOn(0, startAt, this.source.buffer.duration - startAt);
      } else {
        this.track.pausedAt = 0;
        this.source.noteOn(0);
      }
      this.playing = true;
      this.updateTempo();
      this.updateAnimations();
      return this.track.save();
    }
  };

  Deck.prototype.pause = function() {
    this.track.pausedAt += (Date.now() - this.track.startedAt) / 1000;
    this.track.save();
    this.source.noteOff(0);
    this.playing = false;
    return window.webkitCancelRequestAnimationFrame(this.animation);
  };

  Deck.prototype.jumpTo = function(e) {
    if (this.playing) {
      this.pause();
      this.play(e.offsetX * this.path);
    } else {
      this.track.pausedAt = e.offsetX * this.path;
    }
    this.track.save();
    this.updateCursor(e.offsetX);
    return this.updateWave(this.track.pausedAt / this.wavePath);
  };

  Deck.prototype.updateCursor = function(px) {
    if (px >= 550) {
      return window.webkitCancelRequestAnimationFrame(this.animation);
    } else {
      return this.drawCursor(px);
    }
  };

  Deck.prototype.drawCursor = function(px) {
    var playerGradient;
    this.playerCtx.clearRect(0, 0, 550, 50);
    playerGradient = this.playerCtx.createLinearGradient(0, 0, 550, 50);
    playerGradient.addColorStop(0, "#c586e8");
    playerGradient.addColorStop(1, "#6343f2");
    this.playerCtx.fillStyle = playerGradient;
    this.playerCtx.fillRect(0, 0, 550, 50);
    this.playerCtx.drawImage(this.image, 0, 0, 550, 50);
    this.playerCtx.fillStyle = "rgba(0, 0, 255, 0.2)";
    return this.playerCtx.fillRect(0, 0, px, 50);
  };

  Deck.prototype.updateWave = function(px) {
    var wavePos;
    wavePos = 225 - px;
    if (wavePos >= -2775) {
      return this.drawWave(wavePos);
    } else {
      return window.webkitCancelRequestAnimationFrame(this.animation);
    }
  };

  Deck.prototype.drawWave = function(dx) {
    var waveGradient;
    this.waveCtx.clearRect(0, 0, 450, 100);
    waveGradient = this.waveCtx.createLinearGradient(dx, 0, 3000 + dx, 100);
    waveGradient.addColorStop(0, "#84d1f4");
    waveGradient.addColorStop(0.5, "#2d74e5");
    waveGradient.addColorStop(1, "#f24bef");
    this.waveCtx.fillStyle = waveGradient;
    this.waveCtx.fillRect(0, 0, 450, 100);
    this.waveCtx.drawImage(this.image, dx, 0, 3000, 100);
    this.waveCtx.beginPath();
    this.waveCtx.lineWidth = 1;
    this.waveCtx.strokeStyle = "rgba(0, 0, 255, 0.5)";
    this.waveCtx.moveTo(0, 49);
    this.waveCtx.lineTo(450, 49);
    this.waveCtx.stroke();
    this.waveCtx.beginPath();
    this.waveCtx.lineWidth = 2;
    this.waveCtx.strokeStyle = "rgba(255, 0, 0, 0.5)";
    this.waveCtx.moveTo(225, 0);
    this.waveCtx.lineTo(225, 100);
    return this.waveCtx.stroke();
  };

  Deck.prototype.updateAnimations = function() {
    this.animation = window.webkitRequestAnimationFrame(this.updateAnimations);
    this.track.currentTime = (Date.now() - this.track.startedAt) / 1000 + this.track.pausedAt;
    this.updateWave(Math.floor(this.track.currentTime / this.wavePath));
    return this.updateCursor(Math.floor(this.track.currentTime / this.path));
  };

  Deck.prototype.updateTempo = function() {
    this.tempo = ((this.tempoRange.val() - 50) / 400) + 1;
    return this.source.playbackRate.value = this.tempo;
  };

  Deck.prototype.toggleFilter = function(e) {
    var current, elem;
    elem = $(e.target);
    current = parseInt(elem.attr('filter'));
    if (this.lastFilter && this.lastFilter === current) {
      elem.removeClass('active');
      this.convolver.disconnect(0);
      return this.lastFilter = '';
    } else {
      if (!this.lastFilter) this.convolver.connect(this.convolverGain);
      this.lastFilter = current;
      this.convolver.buffer = filterBuffers[this.lastFilter - 1];
      $('.filters .filter').removeClass('active');
      return elem.addClass('active');
    }
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

  Playlist.prototype.el = $('#playlist-container');

  Playlist.prototype.elements = {
    '#playlist': 'playlist'
  };

  Playlist.prototype.events = {
    'click #add': 'addSound'
  };

  function Playlist() {
    this.renderOne = __bind(this.renderOne, this);
    this.render = __bind(this.render, this);    Playlist.__super__.constructor.apply(this, arguments);
    Track.bind('create', this.renderOne);
    Track.bind('refresh', this.render);
    Track.fetch();
  }

  Playlist.prototype.render = function() {
    var track, _i, _len, _ref, _results;
    _ref = Track.all();
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      track = _ref[_i];
      if (!track.local) {
        track.buffer = "";
        track.save();
        _results.push(this.renderOne(track));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  Playlist.prototype.renderOne = function(track) {
    var item;
    item = new Item({
      item: track
    });
    return this.playlist.append(item.render().el);
  };

  Playlist.prototype.addSound = function() {
    var url,
      _this = this;
    url = this.$('#url').val();
    return $.get("http://api.soundcloud.com/resolve.json?url=" + url + "&client_id=" + APPID, function(data) {
      var track;
      track = Track.create({
        sc: data
      });
      track.cover = data.sc.artwork_url || "/static/images/logo.png";
      return track.save();
    });
  };

  Playlist.prototype.loadFile = function(e) {
    var file, files, reader, track, tracks, _i, _len, _results;
    e.stopPropagation();
    e.preventDefault();
    files = e.dataTransfer.files;
    tracks = [];
    reader = new FileReader();
    reader.onload = function(fileEvent) {
      var track;
      track = tracks.shift();
      track.data = fileEvent.target.result;
      return track.save;
    };
    _results = [];
    for (_i = 0, _len = files.length; _i < _len; _i++) {
      file = files[_i];
      console.log(file.type);
      if (file.type.slice(0, -4) === "audio") {
        track = Track.create({
          title: file.name.slice(0, -4),
          local: true,
          cover: "/static/images/logo.png"
        });
        tracks.push(track);
        _results.push(reader.readAsArrayBuffer(file));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  return Playlist;

})(Spine.Controller);

Item = (function(_super) {

  __extends(Item, _super);

  Item.prototype.tag = 'li';

  Item.prototype.events = {
    'click .load-a': 'loadA',
    'click .load-b': 'loadB',
    'click .delete': 'delete'
  };

  function Item() {
    Item.__super__.constructor.apply(this, arguments);
  }

  Item.prototype.render = function() {
    var title;
    title = this.item.title || ("" + this.item.sc.user.username + " - " + this.item.sc.title);
    this.el.html($('#listItemTemplate').tmpl({
      src: this.item.cover,
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

  Item.prototype["delete"] = function() {
    this.item.destroy();
    return this.release();
  };

  return Item;

})(Spine.Controller);

searchList = (function(_super) {

  __extends(searchList, _super);

  searchList.prototype.el = $('#search-container');

  searchList.prototype.events = {
    'keydown #searchField': 'search',
    'click #search': 'renderSearch',
    'click #favs': 'renderFavs',
    'click #tracks': 'renderTracks'
  };

  searchList.prototype.elements = {
    '#searchlist': 'searchlist',
    '#searchField': 'query'
  };

  function searchList() {
    searchList.__super__.constructor.apply(this, arguments);
    this.tab = 'sc';
  }

  searchList.prototype.search = function() {
    var searchString, track, _i, _j, _len, _len2, _ref, _ref2, _results, _results2,
      _this = this;
    this.searchlist.empty();
    searchString = this.query.val().toLowerCase();
    if (this.tab === 'sc') {
      return SC.get('/tracks', {
        q: searchString
      }, function(result) {
        var track, _i, _len, _ref, _results;
        _ref = result.slice(0, 11);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          track = _ref[_i];
          _results.push(_this.renderOne(track));
        }
        return _results;
      });
    } else if (this.tab === 'favs') {
      _ref = User.favs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        track = _ref[_i];
        if (track.user.username.toLowerCase().indexOf(searchString) !== -1 || track.title.toLowerCase().indexOf(searchString) !== -1) {
          _results.push(this.renderOne(track));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    } else {
      _ref2 = User.tracks;
      _results2 = [];
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        track = _ref2[_j];
        if (track.user.username.toLowerCase().indexOf(searchString) !== -1 || track.title.toLowerCase().indexOf(searchString) !== -1) {
          _results2.push(this.renderOne(track));
        } else {
          _results2.push(void 0);
        }
      }
      return _results2;
    }
  };

  searchList.prototype.renderSearch = function() {
    this.searchlist.empty();
    this.tab = 'sc';
    return this.query.attr('placeholder', 'search Soundcloud');
  };

  searchList.prototype.renderFavs = function() {
    var track, _i, _len, _ref, _results;
    this.query.attr('placeholder', 'search your favorites');
    this.tab = 'favs';
    this.searchlist.empty();
    _ref = User.favs;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      track = _ref[_i];
      _results.push(this.renderOne(track));
    }
    return _results;
  };

  searchList.prototype.renderTracks = function() {
    var track, _i, _len, _ref, _results;
    this.query.attr('placeholder', 'search your tracks');
    this.tab = 'tracks';
    this.searchlist.empty();
    _ref = User.tracks;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      track = _ref[_i];
      _results.push(this.renderOne(track));
    }
    return _results;
  };

  searchList.prototype.renderOne = function(track) {
    var item;
    item = new searchItem({
      item: track
    });
    return this.searchlist.append(item.render().el);
  };

  return searchList;

})(Spine.Controller);

searchItem = (function(_super) {

  __extends(searchItem, _super);

  function searchItem() {
    searchItem.__super__.constructor.apply(this, arguments);
  }

  searchItem.prototype.tag = 'li';

  searchItem.prototype.events = {
    'click .add-list': 'addToList'
  };

  searchItem.prototype.render = function() {
    var src, title;
    title = "" + this.item.user.username + " - " + this.item.title;
    src = this.item.artwork_url || '/static/images/logo.png';
    this.el.html($('#searchItemTemplate').tmpl({
      src: src,
      title: title
    }));
    return this;
  };

  searchItem.prototype.addToList = function() {
    var track;
    track = Track.create({
      sc: this.item
    });
    track.cover = this.item.sc.artwork_url || "/static/images/logo.png";
    return track.save();
  };

  return searchItem;

})(Spine.Controller);

searchlist = new searchList;

playlist = new Playlist;

crossfade = function(element) {
  var gain1, gain2, x;
  x = parseInt(element.value) / parseInt(element.max);
  gain1 = Math.cos(x * 0.5 * Math.PI);
  gain2 = Math.cos((1.0 - x) * 0.5 * Math.PI);
  deckA.gainNode.gain.value = gain1;
  return deckB.gainNode.gain.value = gain2;
};

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

document.addEventListener('drop', playlist.loadFile, false);

document.addEventListener('dragover', function(e) {
  e.stopPropagation();
  e.preventDefault();
  return false;
}, false);
