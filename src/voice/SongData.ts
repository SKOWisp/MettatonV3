export class SongData {
	public readonly title: string;
	public readonly url: string | null;
	public readonly author: string | null;
	public readonly authorUrl: string | null;
	public readonly avatar: string | null;
	public readonly thumbnail: string | null;

	public constructor(title: string, url: string | null, author: string | null, authorUrl: string | null, avatar: string | null, thubmnail: string | null) {
		this.title = title;
		this.url = url;
		this.author = author;
		this.authorUrl = authorUrl;
		this.avatar = avatar;
		this.thumbnail = thubmnail;
	}
}