var SAMPLE_RATE, SAMPLE_SIZE, context, crossfade, filterBuffers, filters, float32Concat, getBuffer;

context = new webkitAudioContext();

SAMPLE_SIZE = 2048;

SAMPLE_RATE = 44100;

filters = ["static/impulse-responses/matrix-reverb3.wav", "static/impulse-responses/echo.wav", "static/impulse-responses/cosmic-ping-long.wav"];

filterBuffers = [];

float32Concat = function(first, second) {
  var length, result;
  length = first.length;
  result = new Float32Array(length + 1024);
  result.set(first);
  result.set(second, length);
  return result;
};

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

crossfade = function(element) {
  var gain1, gain2, x;
  x = parseInt(element.value) / parseInt(element.max);
  gain1 = Math.cos(x * 0.5 * Math.PI);
  gain2 = Math.cos((1.0 - x) * 0.5 * Math.PI);
  deckA.gainNode.gain.value = gain1;
  return deckB.gainNode.gain.value = gain2;
};
