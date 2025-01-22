import {
	StreamType,
} from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import { FFmpeg } from 'prism-media';
import { SongData } from '.';
import { YouTubeAgent } from './plugins/YouTubeAgent';
import ytdlex from 'youtube-dl-exec';

interface StreamOptions {
	seek?: number;
	ffmpegArgs?: string[];
	isLive?: boolean;
	type?: StreamType;
}

const chooseBestVideoFormat = (formats: any[], isLive = false) => {
	let filter = (format: any) => format.acodec != 'none';
	// if (isLive) filter = (format: ytdl.videoFormat) => format.hasAudio && format.isHLS;
	formats = formats
		.filter(filter)
		.sort((a, b) => Number(b.abr) - Number(a.abr));
	return formats.find(format => format.vcodec == 'none') || formats.sort((a, b) => Number(b.abr) - Number(a.abr))[0];
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
		const videoInfo: ytdl.videoInfo | void = await ytdl.getBasicInfo(url, YouTubeAgent.ytdlOptions)
			.then((data) => {
				return data;
			})
			.catch((error: Error) => { throw error; });

		const video: any = await ytdlex(url, {
			dumpSingleJson: true,
			noCheckCertificates: true,
			noWarnings: true,
			preferFreeFormats: true,
			addHeader: ['referer:youtube.com', 'user-agent:googlebot']
			})
			.then((output) => {
				return output;
			})
			.catch((error: Error) => { throw error; });

		const formats = video.formats;

		if (!video || !formats.length) throw new Error('This video is unavailable.');
		const bestFormat = chooseBestVideoFormat(formats);
		if (!bestFormat) throw new Error('Unplayable formats.');

		return new MettatonStream(bestFormat.url, videoInfo);
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
			// See https://ffmpeg.org/ffmpeg-protocols.html#http
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
			// Limit download speed
			// See https://github.com/yt-dlp/yt-dlp/pull/10456
			'-maxrate:a', '200k', '-minrate:a', '48k',
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