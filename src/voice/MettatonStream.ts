import {
	StreamType,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { FFmpeg } from 'prism-media';
import { SongData } from '.';
interface StreamOptions {
	seek?: number;
	ffmpegArgs?: string[];
	isLive?: boolean;
	type?: StreamType;
}

export const chooseBestVideoFormat = (formats: ytdl.videoFormat[], isLive = false) => {
	let filter = (format: ytdl.videoFormat) => format.hasAudio;
	if (isLive) filter = (format: ytdl.videoFormat) => format.hasAudio && format.isHLS;
	formats = formats
		.filter(filter)
		.sort((a, b) => Number(b.audioBitrate) - Number(a.audioBitrate) || Number(a.bitrate) - Number(b.bitrate));
	return formats.find(format => !format.hasVideo) || formats.sort((a, b) => Number(a.bitrate) - Number(b.bitrate))[0];
};


// Shamelessly copied from https://distube.js.org
export class MettatonStream {
	/**
	 * Create a stream from yt url
	 * @param {string} url yt url of the video
	 * @returns {MettatonStream}
	 * @private
	 */
	static async YouTube(url: string): Promise<MettatonStream> {
		const video: ytdl.videoInfo | void = await ytdl.getInfo(url)
			.then((data) => {
				return data;
			})
			.catch((error: Error) => { throw error; });

		const formats = video.formats;

		if (!video || !formats.length) throw new Error('This video is unavailable.');
		const bestFormat = chooseBestVideoFormat(formats);
		if (!bestFormat) throw new Error('Unplayable formats.');

		return new MettatonStream(bestFormat.url, video);
	}

	type: StreamType = StreamType.OggOpus;
	stream: FFmpeg;
	url: string;
	songdata: SongData;

	/**
     * Create a MettatonStream to play with {@link FFmpeg}
     * @param {string} url Stream URL.
     * @param {StreamOptions} data Video metadata.
     * @private
	 */
	private constructor(url: string, data: ytdl.videoInfo) {
		/**
		 * Stream URL
		 * @type {string}
		 */
		this.url = url;
		this.songdata = new SongData(data, 'ytdl');

		const args = [
			// Reconnect flags. Pray at least one works
			'-reconnect', '1',
			'-reconnect_streamed', '1',
			'-reconnect_on_network_error', '1',
			'-reconnect_on_http_error', '4xx,5xx',
			'-reconnect_delay_max', '5',

			// Input
			'-i', url,
			// Disable probing
			'-analyzeduration', '0',
			// Limit ffmpeg's console spamming
			'-loglevel', '24', '-hide_banner',
			// Audio options
			'-ar', '48000',
			'-ac', '2',
			'-f', 'opus',
			'-acodec', 'libopus', '-b:a', '48k',
		];


		// if (typeof options.seek === 'number' && options.seek > 0) args.unshift('-ss', options.seek.toString());
		// if (Array.isArray(options.ffmpegArgs) && options.ffmpegArgs.length) args.push(...options.ffmpegArgs);

		/**
		 * FFmpeg stream
		 * @type {FFmpeg}
		 */
		this.stream = new FFmpeg({ args, shell: false });
		(<any> this.stream)._readableState && ((<any> this.stream)._readableState.highWaterMark = 1 << 25);

		// FFmpeg debug
		(<any> this.stream).process.stderr.on('data', (chunk: any) => {
			const info = chunk.toString();
			// if (info.startsWith('size=')) return;
			console.error('FFmpeg: ' + info.replace(/\n+$/, ''));
		});
	}
}