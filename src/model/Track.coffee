# represents a soundcloud or an User loaded Track

class Track extends Spine.Model
	# The Track Spine Model
	@configure "Track", "sc", "buffer", "title", "local", "cover", "bpm", "currentTime"

	# Save the Tracks in local Storage
	@extend Spine.Model.Local
	
	# gets the Track current elapsed Time 
	getCurrentTime: ()->
		(Date.now() - @startedAt)/1000 + @pausedAt