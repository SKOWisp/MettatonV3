import validator from 'validator';
import URL from 'url-parse';
import ytpl from 'ytpl';
import ytdl from 'ytdl-core';
import { safeSong } from '../voice/safeSong';
import { SongData } from '../voice/SongData';
import URLParse from 'url-parse';
// spotify-url-info modules
const fetch = require('isomorphic-unfetch');
const { getData } = require('spotify-url-info')(fetch);

const validatorOpts = {
	require_host: true,
	host_whitelist: ['youtu.be', 'www.youtube.com', 'youtube.com', 'open.spotify.com'],
};

const ytHostnames = ['youtu.be', 'www.youtube.com', 'youtube.com'];
const spotifyHostnames = ['open.spotify.com', 'play.spotify.com'];

// Global variables
let parsed: URLParse<string>;
let hostname: string;

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

	parsed = new URL(query);
	hostname = parsed.hostname;

	// For yt videos and playlists
	if (matches(hostname, ytHostnames)) {
		return await ytUrl(query);
	}

	// For open.spotify.com links
	if (matches(hostname, spotifyHostnames)) {
		return await spotifyUrl(query);
	}

	// Query is just a string
	const song = await safeSong(query);
	if (!song) return 'ytsr (looking up your query in yt) is giving me headaches, try again in a sec.';
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

// Handles YouTube playlists and videos and returns a SongData[] object
async function ytUrl(query: string): Promise<SongData[] | string> {
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
					video.author.user_url ?? null,
					(video.author.thumbnails) ? video.author.thumbnails[0].url : null,
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

		// Check if we have a string or a song
		if (typeof tracks === 'string') {
			return tracks;
		}
		else {
			return shuffle(tracks);
		}
	}
	else {
		return 'The video/playlist seems to be private or doesn\'t exist.';
	}
}

// Handles Spotify tracks, albums, and playlits and returns a SongData[] object
async function spotifyUrl(query: string): Promise<SongData[] | string> {
	// This one is a little different because the module works with:
	// Albums, Tracks, Playlists & Artists

	const result: SongData[] | string = await getData(query).then((data: any) => {
		if (data.type === 'track') {
			// Only able to get title and artist
			return [new SongData(
				data.title + ' by ' + data.artists[0].name,
				null,
				null,
				null,
				null,
				null,
			)];
		}
		else {
			const songs: SongData[] = data.trackList.map((track: any) => {
				// Return song data object per track
				// Only take first artist name
				return new SongData(
					track.title + ' by ' + track.subtitle.split(',')[0],
					null,
					null,
					null,
					null,
					null,
				);
			});
			return songs;
		}
	}).catch((err : any) => {
		console.warn(err);
		return `spotify-url-info (what allows me to retrieve info from spotify) 
		is giving me headaches, try again later. \n
		P.S. I can't read info from private stuff!!!'`;
	});

	return result;
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
