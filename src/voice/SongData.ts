import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import ytsr from 'ytsr';
import validator from 'validator';

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
			ytpl.Item |
			ytsr.Video |
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
		else if (this.source === 'ytpl') {
			this._patchYTPL(info as ytpl.Item);
		}
		else if (this.source === 'ytsr') {
			this._patchYTSR(info as ytsr.Video);
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

	_patchYTPL(i: ytpl.Item) {
		// Sadly ytpl doesn't give much info about the elements in the playlist :(
		this.name = i.title;
		this.urlYT = i.shortUrl;
	}

	_patchYTSR(i: ytsr.Video) {
		this.name = i.title;
		this.urlYT = i.url;
		this.author = {
			name: i.author?.name,
			pageURL: i.author?.url,
			avatarURL: i.author?.bestAvatar?.url ?? undefined,
		};

		this.thumnailURL = i.thumbnails[i.thumbnails.length - 1].url ?? undefined;
		this.duration = i.duration ?? undefined;
	}
}