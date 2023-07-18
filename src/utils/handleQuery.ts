import validator from 'validator';
import URL from 'url-parse';
import ytpl from 'ytpl';
import ytdl from 'ytdl-core';
import { safeSong } from '../voice/safeSong';
import { SongData } from '../voice/SongData';

const validatorOpts = {
	require_host: true,
	host_whitelist: ['youtu.be', 'www.youtube.com', 'youtube.com'],
};

const ytHostnames = ['youtu.be', 'www.youtube.com', 'youtube.com'];

/**
 * Processes a query into a SongData object or a string in case of error
 * @param query
 * @returns
 */
async function handleQuery(query: string): Promise<SongData[] | string> {
	console.log('Parsing: ' + query);

	query.trim();

	// Query is an invalid link
	if (validator.isURL(query) && !validator.isURL(query, validatorOpts)) {
		return 'I do not handle that page';
	}

	const parsed = new URL(query);
	const hostname = parsed.hostname;

	// Handles YouTube playlists and videos
	if (matches(hostname, ytHostnames)) {
		const pathname = parsed.pathname;

		if (pathname === '/watch') {
			const song: SongData[] | string = await ytdl.getBasicInfo(query)
				.then(data => {
					// Return song data object
					const video = data.videoDetails;
					return [new SongData(
						video.title,
						video.videoId,
						video.author.name,
						video.author.user_url,
						video.author.thumbnails![0].url,
						data.thumbnail_url,
					)];
				})
				.catch((err) => {
					console.warn(err);
					return 'Try another link.';
				});
			return song;
		}
		else if (pathname === '/playlist') {
			const tracks: SongData[] | string = await ytpl(query)
				.then(data => {
					const songs: SongData[] = data.items.map(video => {
						// Return song data object per item
						return new SongData(
							video.title,
							video.id,
							video.author.name,
							video.author.url,
							data.author.bestAvatar.url,
							video.bestThumbnail.url,
						);
					});
					return songs;
				})
				.catch((err) => {
					console.warn(err);
					return 'Try another link.';
				});
			return shuffle(tracks as SongData[]);
		}
		else {
			return 'The video/playlist seems to be private or doesn\'t exist.';
		}
	}

	// Query is just a string
	const song = await safeSong(query);
	if (!song) return 'ytsr (looking up yout query in yt) is giving me headaches, try again in a sec.';
	return [song];
}

// Checks if a string is in an array of strings.
function matches(query: string, array: string[]) {
	for (let i = 0; i < array.length; i++) {
		const element = array[i];
		if (query === element) {
			return true;
		}
	}
	return false;
}

// declare the function
function shuffle(array: SongData[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}


export { handleQuery };
