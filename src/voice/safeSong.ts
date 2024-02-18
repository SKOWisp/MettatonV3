import ytsr from 'ytsr';
import { SongData } from '.';
import { timeStringToSeconds } from '..'

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
 * @param maxDuration The max allowed duration of the video, in seconds.
 * @returns
 */
export async function safeSong(query: string, maxDuration: number = 0): Promise<SongData | string> {
	console.log('Looking up: ' + query);

	// Perform the search
	const ytData = await ytsr(query, { limit: searchLimit, requestOptions: { options } }).catch((err) => {
		console.log(`ytsr could not handle the query: ${query}`);
		console.warn(err);
		return null;
	});

	if (!ytData) return 'ytsr (looking up your query in yt) is giving me headaches, try again in a sec.';

	// Filter out non-video elements
	let videos: ytsr.Video[] = ytData.items.filter(i => i.type === 'video') as ytsr.Video[];

	// Somehow none of the results is of type video....
	if (videos.length === 0) {
		return `Your query: *${query}* did not bring up any videos.`;
	}

	// Filter out a videos by duration
	if (maxDuration !== 0) {
		for (let i = 0; i < videos.length; i++) {
			if (timeStringToSeconds(videos[i].duration!) <= maxDuration) {
				videos = [videos[i]];
				break;
			}
			console.log(timeStringToSeconds(videos[i].duration!));
			console.log(videos[i].title, videos[i].duration);
		}

		// None of the videos is under the length limit
		if (videos.length > 1) {
			return `Your query: *${query}* did not bring up any videos under ${maxDuration} seconds. Try changing the server's voice settings.`;
		}
	}

	const vid = videos[0];
	console.log('Found: ' + vid.title);

	return new SongData({ name: vid.title, urlYT: vid.url }, 'youtube');
}
