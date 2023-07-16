import { SongData } from './SongData';
export interface TrackData {
	title: string;
	url: string;
	// eslint-disable-next-line no-unused-vars
	onStart: (song: SongData) => void;
	// eslint-disable-next-line no-unused-vars
	onFinish: (song: SongData) => void;
}

// eslint-disable-next-line no-empty-function
const noop = () => { };


// Track object that stores song data and event functions
export class Track implements TrackData {
	public title: string;
	public url: string;

	// eslint-disable-next-line no-unused-vars
	public readonly onStart: (song: SongData) => void;
	// eslint-disable-next-line no-unused-vars
	public readonly onFinish: (song: SongData) => void;

	private constructor({ title, url, onStart, onFinish }: TrackData) {
		this.title = title;
		this.url = url;
		this.onStart = onStart;
		this.onFinish = onFinish;
	}

	public static from(title: string, methods: Pick<Track, 'onStart' | 'onFinish'>): Track {
		const wrappedMethods = {
			onStart(song: SongData): any {
				wrappedMethods.onStart = noop;
				return methods.onStart(song);
			},
			onFinish(song: SongData) {
				wrappedMethods.onFinish = noop;
				methods.onFinish(song);
			},
		};

		return new Track({
			title: title,
			url: '',
			...wrappedMethods,
		});
	}
}