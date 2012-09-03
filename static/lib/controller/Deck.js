var Deck,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

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
    '.waveform': 'waveform',
    '.info': 'info'
  };

  function Deck() {
    this.updateAnimations = __bind(this.updateAnimations, this);
    this.updateWave = __bind(this.updateWave, this);
    this.updateCursor = __bind(this.updateCursor, this);
    this.updateNode = __bind(this.updateNode, this);
    this.updateInfo = __bind(this.updateInfo, this);
    this.unloadTrack = __bind(this.unloadTrack, this);
    this.loadTrack = __bind(this.loadTrack, this);
    var _this = this;
    Deck.__super__.constructor.apply(this, arguments);
    this.threshold = 0.3;
    this.currentThreshold = 0.3;
    this.decay = 0.02;
    this.beatdetector = new BeatDetektor();
    this.gainNode = context.createGainNode();
    this.analyser = context.createAnalyser();
    this.jsNode = context.createJavaScriptNode(SAMPLE_SIZE / 2);
    this.jsNode.onaudioprocess = function(e) {
      return _this.updateNode(e);
    };
    this.fft = new FFT(SAMPLE_SIZE / 2, SAMPLE_RATE);
    this.signal = new Float32Array(SAMPLE_SIZE / 2);
    this.convolver = context.createConvolver();
    this.convolverGain = context.createGainNode();
    this.convolverGain.gain.value = 0;
    this.playing = false;
    this.waveCtx = this.waveform[0].getContext('2d');
    this.playerCtx = this.player[0].getContext('2d');
    this.spectrumCtx = $('#spectrum')[0].getContext('2d');
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
    this.track.bind('change', this.updateInfo);
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
          _this.track.save();
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
    delete this.track;
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
      this.source.connect(this.jsNode);
      this.jsNode.connect(context.destination);
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

  Deck.prototype.updateInfo = function(track) {
    var ctmin, ctsec, currentTime, dmin, dsec, duration;
    currentTime = track.currentTime;
    ctmin = Math.floor(currentTime / 60);
    ctsec = Math.floor(currentTime - ctmin * 60);
    duration = track.buffer.duration;
    dmin = Math.floor(duration / 60);
    dsec = Math.floor(duration - dmin * 60);
    return this.info.html("" + ctmin + ":" + ctsec + "/" + dmin + ":" + dsec + "  BPM:" + (track.bpm / 10));
  };

  Deck.prototype.updateNode = function(e) {
    var bufferL, bufferR, i;
    if (!this.playing) {
      return false;
    } else {
      bufferL = e.inputBuffer.getChannelData(0);
      bufferR = e.inputBuffer.getChannelData(1);
      this.signal = (function() {
        var _ref, _results;
        _results = [];
        for (i = 0, _ref = (SAMPLE_SIZE / 2) - 1; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
          _results.push((bufferL[i] + bufferR[i]) / 2);
        }
        return _results;
      })();
      this.fft.forward(this.signal);
      this.updateSpectrum();
      return this.bpm();
    }
  };

  Deck.prototype.bpm = function() {
    this.beatdetector.process(this.track.getCurrentTime(), this.fft.spectrum);
    this.track.bpm = this.beatdetector.win_bpm_int;
    return this.track.save();
  };

  Deck.prototype.detectBeat = function() {
    var i, magnitude;
    magnitude = 0;
    for (i = 0; i <= 10; i++) {
      if (this.fft.spectrum[i] > magnitude) magnitude = this.fft.spectrum[i];
    }
    if (magnitude >= this.threshold && magnitude >= this.currentThreshold) {
      this.currentThreshold = magnitude;
      return this.countBeats();
    } else {
      return this.currentThreshold -= this.decay;
    }
  };

  Deck.prototype.countBeats = function() {
    var now;
    now = Date.now();
    if (!this.firstBeat) {
      this.firstBeat = now;
      this.beats = 1;
    } else {
      this.beats++;
    }
    if (this.beats > 40) {
      this.bpm = (this.beats * 60000) / ((now - this.firstBeat) * 4);
      return console.log(this.bpm);
    }
  };

  Deck.prototype.updateSpectrum = function() {
    var i, _results;
    this.spectrumCtx.clearRect(0, 0, 256, 50);
    this.spectrumCtx.fillStyle = "black";
    _results = [];
    for (i = 0; i <= 256; i++) {
      _results.push(this.spectrumCtx.fillRect(i, 50, 1, -this.fft.spectrum[i] * 50));
    }
    return _results;
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
    this.track.save();
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
