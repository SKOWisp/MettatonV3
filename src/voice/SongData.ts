import { MediaInfo } from "youtubei.js/dist/src/core/mixins";
import { VideoInfo } from "youtubei.js/dist/src/parser/youtube";

interface BasicYTData {
	title: string;
	urlYT: string;
}

export class SongData {
	// The only real requirement is a string that can be looked-up later
	public title!: string;
	public source!: string;
	public urlYT?: string;
	public streamURL?: string;
	public author!: {
		name: string,
		pageURL?: string,
		avatarURL?: string,
	};
	public thumnailURL?: string;
	public duration?: string;

	constructor(
		info:
			MediaInfo |
			BasicYTData |
			string,
		source: string,
	) {
		if (typeof source !== 'string') {
			throw new Error('bruh');
		}

		this.source = source;

		// Don't judge me
		if (this.source === 'ytdl') {
			this._patchInnertube(info as MediaInfo);
		}
		else if (this.source === 'youtube') {
			this.title = (info as BasicYTData).title;
			this.urlYT = (info as BasicYTData).urlYT;
		}
		else {
			this.title = (info as string);
		}

	}

	_patchInnertube(i: MediaInfo) {
		const details = i.basic_info
		// console.log(details)
		this.title = details.title!
		this.urlYT = `https://www.youtube.com/watch?v=${details.id}`

		const author = (i as VideoInfo).secondary_info?.owner?.author
		if (author) {
			this.author = { 
				name: author.name, 
				pageURL: author.url, 
				avatarURL: author.best_thumbnail?.url
			};
		} else {
			this.author = { name: i.basic_info.author ? i.basic_info.author : 'HOW'}
		}
		
		const bestThumbnail = details.thumbnail?.filter(t => t.width < 336)[0];
		this.thumnailURL = bestThumbnail!.url;
		this.duration = details.duration?.toString();
	}
}