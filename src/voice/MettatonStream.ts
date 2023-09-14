import {
	StreamType,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { FFmpeg } from 'prism-media';

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


// Shamelesly copied from https://distube.js.org
export class MettatonStream {
	/**
	 * Create a stream from yt url
	 * @param {string} url yt url of the video
	 * @returns {MettatonStream}
	 * @private
	 */
	static async YouTube(url: string): Promise<MettatonStream> {
		const formats: ytdl.videoFormat[] | void = await ytdl.getInfo(url)
			.then((data) => {
				return data.formats;
			})
			.catch((error: Error) => { throw error; });

		if (!formats || !formats.length) throw new Error('This video is unavailable.');
		const bestFormat = chooseBestVideoFormat(formats!);
		if (!bestFormat) throw new Error('Unplayable formats.');

		return new MettatonStream(bestFormat.url);
	}

	type: StreamType;
	stream: FFmpeg;
	url: string;

	/**
     * Create a MettatonStream to play with {@link }
     * @param {string} url Stream URL
     * @param {StreamOptions} options Stream options
     * @private
	 */
	private constructor(url: string) {
		/**
		 * Stream URL
		 * @type {string}
		 */
		this.url = url;
		/**
		 * Stream type
		 * @type {DiscordVoice.StreamType}
		 */

		this.type = StreamType.OggOpus;
		const args = [
			'-reconnect',
			'1',
			'-reconnect_streamed',
			'1',
			'-reconnect_delay_max',
			'5',
			'-i',
			url,
			'-analyzeduration',
			'0',
			'-loglevel',
			'0',
			'-ar',
			'48000',
			'-ac',
			'2',
			'-f',
		];

		args.push('opus', '-acodec', 'libopus');

		// if (typeof options.seek === 'number' && options.seek > 0) args.unshift('-ss', options.seek.toString());
		// if (Array.isArray(options.ffmpegArgs) && options.ffmpegArgs.length) args.push(...options.ffmpegArgs);

		/**
		 * FFmpeg stream
		 * @type {FFmpeg}
		 */
		this.stream = new FFmpeg({ args, shell: false });
		(<any> this.stream)._readableState && ((<any> this.stream)._readableState.highWaterMark = 1 << 25);
	}
}