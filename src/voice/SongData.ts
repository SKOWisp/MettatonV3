export class SongData {
	public readonly title: string;
	public readonly url: string;
	public readonly author: string | undefined;
	public readonly authorUrl: string | undefined;
	public readonly avatar: string | undefined | null;
	public readonly thumbnail: string | null;

	public constructor(title: string, url: string, author: string | undefined, authorUrl: string | undefined, avatar: string | undefined | null, thubmnail: string | null) {
		this.title = title;
		this.url = url;
		this.author = author;
		this.authorUrl = authorUrl;
		this.avatar = avatar;
		this.thumbnail = thubmnail;
	}
}
