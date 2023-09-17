import ytdl from 'ytdl-core';


interface BasicYTData {
	name: string;
	urlYT: string;
}


export class SongData {
	// The only real requirement is a string that can be looked-up later
	public name!: string;
	public source!: string;
	public urlYT?: string;
	public streamURL?: string;
	public author!: {
		name?: string,
		pageURL?: string,
		avatarURL?: string,
	};
	public thumnailURL?: string;
	public duration?: string;

	constructor(
		info:
			ytdl.videoInfo |
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
			this._patchYTDL(info as ytdl.videoInfo);
		}
		else if (this.source === 'youtube') {
			this.name = (info as BasicYTData).name;
			this.urlYT = (info as BasicYTData).urlYT;
		}
		else {
			this.name = (info as string);
		}

	}

	_patchYTDL(i: ytdl.videoInfo) {
		const details = i.videoDetails;

		this.name = details.title;
		this.urlYT = details.video_url;
		this.author = {
			name: details.author.name,
			pageURL: details.author.user_url,
			avatarURL: (details.author.thumbnails) ? details.author.thumbnails[0].url : undefined,
		};

		const bestThumbnail = details.thumbnails.filter(t => t.width < 336).pop();
		this.thumnailURL = bestThumbnail!.url;
		this.duration = details.lengthSeconds;
	}
}