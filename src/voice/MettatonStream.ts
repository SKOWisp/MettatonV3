import {
	StreamType,
} from '@discordjs/voice';
import { FFmpeg } from 'prism-media';

import ytdl from '@distube/ytdl-core';
import { Payload, Format, FormatNote } from 'youtube-dl-exec';
import ytdlex from 'youtube-dl-exec';

import { SongData } from '.';
import { YouTubeAgent } from './plugins';
import { checkUrl } from '../utils';

interface StreamOptions {
	seek?: number;
	ffmpegArgs?: string[];
	isLive?: boolean;
	type?: StreamType;
}

export const chooseBestVideoFormat = (formats: ytdl.videoFormat[] | Format[], isLive = false) => {
	if ((formats[0] as any).hasAudio !== undefined) {
		formats = formats as ytdl.videoFormat[]

		let filter = (format: ytdl.videoFormat) => format.hasAudio;
		if (isLive) filter = (format: ytdl.videoFormat) => format.hasAudio && format.isHLS;
		formats = formats
			.filter(filter)
			.sort((a, b) => Number(b.audioBitrate) - Number(a.audioBitrate) || Number(a.bitrate) - Number(b.bitrate));
		return formats.find(format => !format.hasVideo) || formats.sort((a, b) => Number(a.bitrate) - Number(b.bitrate))[0];
	}
	else {
		formats = formats as Format[]
		
		let filter = (format: Format) => format.acodec != 'none' && !format.acodec;
		if (isLive) filter = (format: Format) => format.acodec != 'none' && !format.acodec && format.format.includes('m3u8');
		formats = formats
			.filter(filter)
			.sort((a, b) => Number(b.abr) - Number(a.abr) || Number(a.tbr) - Number(b.tbr));
		return formats.find(format => format.vcodec == 'none') || formats.sort((a, b) => Number(b.tbr) - Number(a.tbr))[0];
	}
};



export class MettatonStream {
	/**
	 * Create a stream from yt url
	 * @param {string} url yt url of the video
	 * @returns {MettatonStream}
	 * @private
	 */
	static async YouTube(url: string): Promise<MettatonStream> {
		const videoInfo: ytdl.videoInfo | void = await ytdl.getInfo(url, YouTubeAgent.ytdlOptions)
			.then((data) => {
				return data;
			})
			.catch((error: Error) => { throw error; });

		const formats = videoInfo.formats;

		if (!videoInfo || !formats.length) throw new Error('This video is unavailable.');
		const bestFormat = chooseBestVideoFormat(formats);
		if (!bestFormat) throw new Error('Unplayable formats.');
		
		return await checkUrl(bestFormat.url).then(async (isAccessible) => {
			if (isAccessible) {
				console.log('Proceeding with @distube/ytdl...');
				return new MettatonStream(bestFormat.url, videoInfo);
			} else {
				console.log('Trying with youtube-dl-exec...');
				const video: Payload | string = await ytdlex(url, {
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
				
				if (!video || typeof video === 'string' || !video.formats.length) throw new Error('This video is unavailable.');
				const bestFormat = chooseBestVideoFormat(video.formats);
				if (!bestFormat) throw new Error('Unplayable formats.');

				return new MettatonStream(bestFormat.url, videoInfo);
			}
		});
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
			'-reconnect_on_http_error', '5xx',
			'-reconnect_delay_max', '5',
			// https://stackoverflow.com/questions/68209379/error-in-the-pull-function-keepalive-request-failed-for-when-opening-url
			// There should be a better fix...
			'-http_persistent', '0',

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
			// if (info.startsWith('size=')) return;
			
			if (info.slice(1,5) == 'http' && info.includes('HTTP error 403 Forbidden')) {
				console.warn('lmao')
			}

			const msg = 'FFmpeg: ' + info.replace(/\n+$/, '')
			console.error(msg);
		});
	}
}