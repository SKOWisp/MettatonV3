import { Innertube, SessionOptions } from 'youtubei.js';
import { checkInvalidKey } from '../../utils';

async function getYouTube() {
  const mod = await import('youtubei.js');
  return mod.default ?? mod;
}


export type InnertubeOptions = {
	/**
	 * Innertube options
	 */
	cookies?: string
	/**
	 * Innertube options
	 */
	innertubeOptions?: SessionOptions
};



export class YouTubeAgent {
	static #cookies?: string;
	static cookies?: string;
	static #ytdlOptions: SessionOptions;
	static innertube: Innertube;

	static async CreateYTAgent(options: InnertubeOptions = {}) {
		// checkInvalidKey(options, ['cookies', 'InnertubeOptions'], 'YouTubeAgent');
		// this.cookies = this.#cookies = options.cookies ? clone(options.cookies) : undefined;
		// this.#ytdlOptions = options?.innertubeOptions ? clone(options.innertubeOptions) : {};

		this.innertube = await Innertube.create(options.innertubeOptions).catch((error: Error) => { throw error; });
	}
	/*
	static get ytdlOptions(): SessionOptions {
		if (this.cookies !== this.#cookies) this.#ytdlOptions.agent = ytdl.createAgent((this.#cookies = this.cookies));
		return this.#ytdlOptions;
	}\
	*/
	/* 
	static get ytCookie(): string {
		const agent = this.#ytdlOptions.agent;
		if (!agent) return '';
		const { jar } = agent;
		return jar.getCookieStringSync('https://www.youtube.com');
	}
	*/
}

const clone = <T>(obj: T): T => {
	const result: T = <T>(Array.isArray(obj) ? [] : {});
	for (const key in obj) {
		result[key] = typeof obj[key] === 'object' ? clone(obj[key]) : obj[key];
	}
	return result;
};

