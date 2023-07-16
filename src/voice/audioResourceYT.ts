import { Track } from './Track';
import {
	AudioResource,
	createAudioResource,
	demuxProbe,
} from '@discordjs/voice';
import ytdl from 'youtube-dl-exec';

/**
 * Creates an audio resource from a YT url
 * @param track
 * @returns
 */

function audioResourceYT(track: Track): Promise <AudioResource<Track>> {
	return new Promise((resolve, reject) => {
		const process = ytdl.exec(
			track.url,
			{
				noPlaylist: true,
				output: '-',
				format: 'ba[asr=48000][ext=webm][acodec=opus]/ba',
				limitRate: '100K',
				quiet: true,
			},
			{ stdio: ['ignore', 'pipe', 'ignore'] },
		);

		if (!process.stdout) {
			reject(new Error('No stdout'));
			return;
		}

		const stream = process.stdout;
		const onError = (error: Error) => {
			if (!process.killed) process.kill();
			stream.resume();
			reject(error);
		};

		process
			.once('spawn', () => {
				demuxProbe(stream)
					.then((probe) => resolve(createAudioResource(probe.stream, { metadata: track, inputType: probe.type })))
					.catch(onError);
			})
			.catch(onError);
	});
}

export { audioResourceYT };