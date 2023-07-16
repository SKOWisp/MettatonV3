import ytsr from 'ytsr';
import { SongData } from './SongData';
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
	const ytData = await ytsr(query, { limit: searchLimit, requestOptions: { options } }).catch((err) => console.warn(err));
	if (!ytData) {
		console.log(`ytsr could not handle the query: ${query}`);
		return null;
	}

	// Filter out non-video elements
	let ytItem: ytsr.Item;
	for (let i = 0; i < searchLimit; i++) {
		if (ytData.items[i].type === 'video') {
			ytItem = ytData!.items[i];
			break;
		}
	}

	// Somehow none of the results is of type video....
	if (!ytItem!) {
		console.log(`WOW, ${query} did not bring up any videos`);
		return null;
	}

	const ytVideo = (ytItem! as ytsr.Video);
	return new SongData(
		ytVideo.title,
		ytVideo.url,
		ytVideo.author?.name,
		ytVideo.author?.url,
		ytVideo.author?.bestAvatar?.url,
		ytVideo.bestThumbnail.url,
	);
}