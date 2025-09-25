import { StreamType } from '@discordjs/voice';

import prism from 'prism-media';
const { FFmpeg } = prism;

import { SongData } from '.';
import { YouTubeAgent } from './plugins';

import { VideoInfo } from 'youtubei.js/dist/src/parser/youtube';
import { MediaInfo } from 'youtubei.js/dist/src/core/mixins';
import { FormatOptions } from 'youtubei.js/dist/src/types';
import { Format } from 'youtubei.js/dist/src/parser/misc';

interface StreamOptions {
	seek?: number;
	ffmpegArgs?: string[];
	isLive?: boolean;
	type?: StreamType;
}

export const chooseBestVideoFormat = (formats: Format[], isLive = false) => {
	formats = formats as Format[]
		
	let filter = (format: Format) => format.has_audio;
	// if (isLive) filter = (format: Format) => format.acodec != 'none' && !format.acodec && format.format.includes('m3u8');
	formats = formats
		.filter(filter)
		.sort((a, b) => Number(b.audio_sample_rate) - Number(a.audio_sample_rate) || Number(a.bitrate) - Number(b.bitrate));
	return formats.find(format => !format.has_video) || formats.sort((a, b) => Number(b.bitrate) - Number(a.bitrate))[0];
};



export class MettatonStream {
	/**
	 * Create a stream from yt url
	 * @param {string} url yt url of the video
	 * @returns {MettatonStream}
	 * @private
	 */
	static async YouTube(url: string): Promise<MettatonStream> {
		const nav_end = await YouTubeAgent.innertube.resolveURL(url)

		YouTubeAgent.innertube.getInfo
		const videoInfo: VideoInfo | void = await YouTubeAgent.innertube.getBasicInfo(nav_end.payload.videoId)
			.then((data) => {
				return data;
			})
			.catch((error: Error) => { 
				console.error("Innertube Error with:", url);
				throw error; 
			});

		const options: FormatOptions = {
			type: "audio",
			quality: "best",
		};
		
		if (!videoInfo.streaming_data) throw new Error('This video is unavailable.');
		const bestFormat = chooseBestVideoFormat(videoInfo.streaming_data?.adaptive_formats);
		if (!bestFormat) throw new Error('Unplayable formats.');
		// console.log(bestFormat)
		const stream_url = YouTubeAgent.innertube.session.player?.decipher(bestFormat.url)
		if (!stream_url) throw new Error('Video stream could not be deciphered.');
		// console.log(stream_url)
			
		return new MettatonStream(stream_url, videoInfo);
	}

	type: StreamType = StreamType.OggOpus;
	stream: any;
	url: string;
	songdata: SongData;

	/**
     * Create a MettatonStream to play with {@link FFmpeg}
     * @param {string} url Stream URL.
     * @param {StreamOptions} data Video metadata.
     * @private
	 */
	private constructor(url: string, data: MediaInfo) {
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
			'-reconnect_on_http_error', '5xx',
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
			const info: string = chunk.toString();

			if (info.slice(1,5) == 'http' && info.includes('HTTP error 403 Forbidden')) {
				console.warn('lmao')
			}

			const msg = 'FFmpeg: ' + info.replace(/\n+$/, '')
			console.error(msg);
		});
	}
}