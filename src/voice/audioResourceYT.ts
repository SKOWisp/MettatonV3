import {
	AudioResource,
	createAudioResource,
	demuxProbe,
} from '@discordjs/voice';
import ytdl, { videoFormat } from 'ytdl-core';
import { SongData } from './SongData';

/**
 * Creates an audio resource from a YT url
 * @param song
 * @returns
 */

function audioResourceYT(song: SongData): Promise <AudioResource<SongData>> {
	return new Promise((resolve, reject) => {
		// Filter formats
		const filter = (format: videoFormat) => {
			if (format.audioCodec === 'opus' && format.audioBitrate === 48 && !format.hasVideo) {
				return true;
			}
			return false;
		};

		const download = ytdl(song.id, {
			filter: filter,
			dlChunkSize: 2048,
		});

		// Function to call if there is an error
		const onError = (error: Error) => {
			if (!download.destroyed) download.destroy();
			download.resume();
			reject(error);
		};

		// Probe the stream and then create audio resource
		download.once('readable', async () => {
			const { stream, type } = await demuxProbe(download);
			// Example of filtering the formats to audio only.
			resolve(createAudioResource(stream, { metadata: song, inputType: type }));
		});

		download.on('error', onError);
	});
}

export { audioResourceYT };