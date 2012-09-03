var Searchlist, searchItem,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Searchlist = (function(_super) {

  __extends(Searchlist, _super);

  Searchlist.prototype.el = $('#search-container');

  Searchlist.prototype.events = {
    'keydown #searchField': 'search',
    'click #search': 'renderSearch',
    'click #favs': 'renderFavs',
    'click #tracks': 'renderTracks'
  };

  Searchlist.prototype.elements = {
    '#searchlist': 'searchlist',
    '#searchField': 'query'
  };

  function Searchlist() {
    Searchlist.__super__.constructor.apply(this, arguments);
    this.tab = 'sc';
  }

  Searchlist.prototype.search = function() {
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

  Searchlist.prototype.renderSearch = function() {
    this.searchlist.empty();
    this.tab = 'sc';
    return this.query.attr('placeholder', 'search Soundcloud');
  };

  Searchlist.prototype.renderFavs = function() {
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

  Searchlist.prototype.renderTracks = function() {
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

  Searchlist.prototype.renderOne = function(track) {
    var item;
    item = new searchItem({
      item: track
    });
    return this.searchlist.append(item.render().el);
  };

  return Searchlist;

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
    var cover, track;
    cover = this.item.artwork_url || "/static/images/logo.png";
    track = Track.create({
      sc: this.item,
      cover: cover
    });
    return track.save();
  };

  return searchItem;

})(Spine.Controller);
