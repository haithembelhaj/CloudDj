var APPID, Deck, Item, Playlist, Track, context, crossfade, deckA, deckB, filterBuffers, filters, getBuffer, playlist, searchItem, searchList, searchlist,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

APPID = '829b2b95de282fa7cf7297e7ab2960ed';

SC.initialize({
  client_id: APPID,
  redirect_uri: "http://clouddj.herokuapp.com/static/callback.html"
});

context = new webkitAudioContext();

filters = ["static/impulse-responses/matrix-reverb3.wav", "static/impulse-responses/echo.wav", "static/impulse-responses/cosmic-ping-long.wav"];

filterBuffers = [];

getBuffer = function(url, progress, callback) {
  var request;
  request = new XMLHttpRequest;
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  request.onprogress = progress;
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

  Track.configure("Track", "sc", "buffer");

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
    '.tempo': 'tempo',
    '.player': 'player',
    '.cover': 'cover',
    '.effect': 'effect',
    '.waveform': 'waveform'
  };

  function Deck() {
    this.updateWave = __bind(this.updateWave, this);
    this.updateCursor = __bind(this.updateCursor, this);
    this.unloadTrack = __bind(this.unloadTrack, this);
    this.loadTrack = __bind(this.loadTrack, this);
    var _this = this;
    Deck.__super__.constructor.apply(this, arguments);
    this.gainNode = context.createGainNode();
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
    var url, _ref,
      _this = this;
    this.track = track;
    this.track.bind('destroy', this.unloadTrack);
    if ((_ref = this.source) != null) _ref.noteOff(0);
    this.wavePos = 225;
    this.playerPos = 0;
    this.el.addClass('buffering');
    this.image.src = this.track.sc.waveform_url;
    this.cover.css('background-image', "url(" + this.track.sc.artwork_url + ")");
    if (!this.track.buffer) {
      url = track.sc.stream_url + ("?client_id=" + APPID);
      return getBuffer('/stream?url=' + escape(url), function(ev) {
        return _this.drawCursor((ev.loaded / ev.total) * 550);
      }, function(buffer) {
        _this.track.buffer = buffer;
        _this.path = _this.track.buffer.duration / 550;
        _this.wavePath = _this.track.buffer.duration / 3000;
        _this.track.save();
        _this.el.removeClass('buffering');
        return _this.drawCursor(0);
      });
    } else {
      this.el.removeClass('buffering');
      this.path = this.track.buffer.duration / 550;
      return this.wavePath = this.track.buffer.duration / 3000;
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
      this.source.connect(this.gainNode);
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
      this.track.save();
      this.playing = true;
      return this.updateTempo();
    }
  };

  Deck.prototype.pause = function() {
    this.track.pausedAt += (Date.now() - this.track.startedAt) / 1000;
    this.track.save();
    this.source.noteOff(0);
    this.playing = false;
    clearInterval(this.updater);
    return clearInterval(this.waver);
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
    if (px) {
      this.playerPos = px;
      this.drawCursor(this.playerPos);
    }
    if (this.playerPos >= 550) {
      return clearInterval(this.updater);
    } else {
      this.playerPos++;
      return this.drawCursor(this.playerPos);
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
    if (px) {
      this.wavePos = 225 - px;
      this.drawWave(this.wavePos);
    }
    this.wavePos--;
    if (this.wavePos >= -2776) {
      return this.drawWave(this.wavePos);
    } else {
      return clearInterval(this.waver);
    }
  };

  Deck.prototype.drawWave = function(dx) {
    var waveGradient;
    this.waveCtx.clearRect(0, 0, 3000, 99);
    waveGradient = this.waveCtx.createLinearGradient(dx, 0, 3000 + dx, 99);
    waveGradient.addColorStop(0, "#84d1f4");
    waveGradient.addColorStop(0.5, "#2d74e5");
    waveGradient.addColorStop(1, "#f24bef");
    this.waveCtx.fillStyle = waveGradient;
    this.waveCtx.fillRect(dx, 0, 3000, 99);
    this.waveCtx.drawImage(this.image, dx, 0, 3000, 99);
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
    this.waveCtx.lineTo(225, 99);
    return this.waveCtx.stroke();
  };

  Deck.prototype.updateTempo = function() {
    var val;
    val = ((this.tempo.val() - 50) / 200) + 1;
    this.source.playbackRate.value = val;
    if (this.updater) clearInterval(this.updater);
    this.updater = setInterval(this.updateCursor, (this.path * 1000) / val);
    if (this.waver) clearInterval(this.waver);
    return this.waver = setInterval(this.updateWave, (this.wavePath * 1000) / val);
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
      track.buffer = "";
      track.save();
      _results.push(this.renderOne(track));
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
      return track.save();
    });
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
    var src, title;
    title = "" + this.item.sc.user.username + " - " + this.item.sc.title;
    src = this.item.sc.artwork_url;
    this.el.html($('#listItemTemplate').tmpl({
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
    'keydown #search': 'renderSearch',
    'click #favorites': 'renderFav'
  };

  searchList.prototype.elements = {
    '#searchlist': 'searchlist',
    '#search': 'query'
  };

  function searchList() {
    searchList.__super__.constructor.apply(this, arguments);
  }

  searchList.prototype.renderSearch = function() {
    var _this = this;
    this.searchlist.empty();
    return SC.get('/tracks', {
      q: this.query.val()
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
  };

  searchList.prototype.renderFav = function() {
    return this.searchlist.empty();
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
    src = this.item.artwork_url;
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
