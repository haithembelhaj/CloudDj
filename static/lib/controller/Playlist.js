var Item, Playlist,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

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
