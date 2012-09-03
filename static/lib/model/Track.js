var Track,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Track = (function(_super) {

  __extends(Track, _super);

  function Track() {
    Track.__super__.constructor.apply(this, arguments);
  }

  Track.configure("Track", "sc", "buffer", "title", "local", "cover", "bpm");

  Track.extend(Spine.Model.Local);

  Track.prototype.getCurrentTime = function() {
    return (Date.now() - this.startedAt) / 1000 + this.pausedAt;
  };

  return Track;

})(Spine.Model);
