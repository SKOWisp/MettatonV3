import {
	AudioResource,
	createAudioResource,
	demuxProbe,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { SongData } from './SongData';

/**
 * Creates an audio resource from a YT url
 * @param song
 * @returns
 */
function audioResourceYT(song: SongData): Promise <AudioResource<SongData>> {
	return new Promise((resolve, reject) => {
		const download = ytdl(song.url!, {
			filter: 'audioonly',
			quality: [249, 250, 171, 251],
			dlChunkSize: 2048,
		});

		// Probe the stream and then create audio resource
		download.once('readable', async () => {
			const { stream, type } = await demuxProbe(download);
			resolve(createAudioResource(stream, { metadata: song, inputType: type }));
		});

		// Function to call if there is an error
		// Normally occurs when no video with desired quality is found.
		const onError = (error: Error) => {
			if (!download.destroyed) download.destroy();
			download.resume();
			reject(error);
		};

		download.on('error', onError);
	});
}

export { audioResourceYT };