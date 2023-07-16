import validator from 'validator';
import URL from 'url-parse';
import ytpl from 'ytpl';
import ytdl from 'ytdl-core';

const options = {
	require_host: true,
	host_whitelist: ['youtu.be', 'www.youtube.com', 'youtube.com'],
};

const ytHostnames = ['youtu.be', 'www.youtube.com', 'youtube.com'];

/**
 * Reads a query and processes it in case it is a url.
 * @param query
 * @returns
 */
async function handleQuery(query: string): Promise<string[] | string> {
	console.log('Parsing: ' + query);

	query.trim();

	// Query is an invalid link
	if (validator.isURL(query) && !validator.isURL(query, options)) {
		return 'I do not handle that page';
	}

	const parsed = new URL(query);
	const hostname = parsed.hostname;

	// Handles YouTube playlists and videos
	if (matches(hostname, ytHostnames)) {
		const pathname = parsed.pathname;

		if (pathname === '/watch') {
			const track: string[] | string = await ytdl.getBasicInfo(query)
				.then(data => {
					const title = data.videoDetails.title;
					const author = data.videoDetails.author.name;
					return [title + ' ' + author];
				})
				.catch((err) => {
					console.warn(err);
					return 'Try another link';
				});
			return track;
		}
		else if (pathname === '/playlist') {
			const tracks: string[] | string = await ytpl(query)
				.then(data => {
					const titles = data.items.map(track => {
						return track.title + ' ' + track.author.name;
					});
					return titles;
				})
				.catch((err) => {
					console.warn(err);
					return 'Try another link';
				});
			return shuffle(tracks as string[]);
		}
		else {
			return 'The youtube link appears to be defective, try another one.';
		}
	}

	// Query is just a string
	return [query];
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
function shuffle(array: string[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

export { handleQuery };
