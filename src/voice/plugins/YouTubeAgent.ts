import ytdl from '@distube/ytdl-core';
import { checkInvalidKey } from '../../utils';

export type YTDLOptions = {
	/**
	 * YouTube Cookies
	 */
	cookies?: ytdl.Cookie[];
	/**
	 * ytdl-core options
	 */
	ytdlOptions?: ytdl.getInfoOptions;
};

export class YouTubeAgent {
	static #cookies?: ytdl.Cookie[];
	static cookies?: ytdl.Cookie[];
	static #ytdlOptions: ytdl.getInfoOptions;

	static CreateYTAgent(options: YTDLOptions = {}) {
		checkInvalidKey(options, ['cookies', 'ytdlOptions'], 'YouTubeAgent');
		this.cookies = this.#cookies = options.cookies ? clone(options.cookies) : undefined;
		this.#ytdlOptions = options?.ytdlOptions ? clone(options.ytdlOptions) : {};
		this.#ytdlOptions.agent = ytdl.createAgent(this.cookies);
	}

	static get ytdlOptions(): ytdl.getInfoOptions {
		if (this.cookies !== this.#cookies) this.#ytdlOptions.agent = ytdl.createAgent((this.#cookies = this.cookies));
		return this.#ytdlOptions;
	}

	static get ytCookie(): string {
		const agent = this.#ytdlOptions.agent;
		if (!agent) return '';
		const { jar } = agent;
		return jar.getCookieStringSync('https://www.youtube.com');
	}
}

const clone = <T>(obj: T): T => {
	const result: T = <T>(Array.isArray(obj) ? [] : {});
	for (const key in obj) {
		result[key] = typeof obj[key] === 'object' ? clone(obj[key]) : obj[key];
	}
	return result;
};
