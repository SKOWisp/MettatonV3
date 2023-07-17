import {
	AudioResource,
	createAudioResource,
	demuxProbe,
} from '@discordjs/voice';
import ytdl from 'youtube-dl-exec';
import { SongData } from './SongData';

/**
 * Creates an audio resource from a YT url
 * @param song
 * @returns
 */

function audioResourceYT(song: SongData): Promise <AudioResource<SongData>> {
	return new Promise((resolve, reject) => {
		const process = ytdl.exec(
			song.id,
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
					.then((probe) => resolve(createAudioResource(probe.stream, { metadata: song, inputType: probe.type })))
					.catch(onError);
			})
			.catch(onError);
	});
}

export { audioResourceYT };