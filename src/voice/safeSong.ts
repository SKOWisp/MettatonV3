import ytsr from 'ytsr';
import { SongData } from '.';
import 'dotenv/config';

const searchLimit = Number(process.env.SEARCH_LIMIT);
const options = {
	maxRetries: 4,
	maxReconnects: 2,
};

/**
 * Attemps to lookup a string in YT, returns metadata if successful,
 * otherwise null.
 * @param query The string that will be looked up
 * @returns
 */

export async function safeSong(query: string): Promise<SongData | null> {
	console.log('Looking up: ' + query);

	// Perform the search
	const ytData = await ytsr(query, { limit: searchLimit, requestOptions: { options } }).catch((err) => {
		console.log(`ytsr could not handle the query: ${query}`);
		console.warn(err);
		return null;
	});

	if (!ytData) return null;

	// Filter out non-video elements
	let ytItem: ytsr.Item | null = null;
	for (let i = 0; i < searchLimit; i++) {
		if (ytData.items[i].type === 'video') {
			ytItem = ytData!.items[i];
			break;
		}
	}

	// Somehow none of the results is of type video....
	if (!ytItem) {
		console.log(`WOW, ${query} did not bring up any videos`);
		return null;
	}

	const vid = (ytItem! as ytsr.Video);
	console.log('Found: ' + vid.title);

	return new SongData({ name: vid.title, urlYT: vid.url }, 'youtube');
}