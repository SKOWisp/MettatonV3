import {
	SongData,
	safeSong,
	ytHostnames,
	spotifyHostnames,
	validatorOpts,
} from '..';

import { matches, shuffle } from '.';

import validator from 'validator';
import URLParse from 'url-parse';
import ytpl from 'ytpl';
import { YouTubeAgent } from '../voice/plugins';

// spotify-url-info modules
import fetch from 'isomorphic-unfetch'
// Inside an async context (or top-level if your Node version supports it)
// @ts-ignore
const { getData } = (await import('spotify-url-info')).default(fetch);

/**
 * Processes a query into a SongData object or a string in case of error
 * @param query
 * @param doShuffle Whether to pre-shuffle songs added from playlists
 * @returns
 */
async function handleQuery(query: string, doShuffle: boolean = true, maxDuration: number = 0): Promise<SongData[] | string> {

	console.log('Parsing: ' + query);

	query.trim();

	// Query is an invalid link
	if (validator.isURL(query) && !validator.isURL(query, validatorOpts)) {
		return 'I do not handle that page';
	}

	const parsed = new URLParse(query);

	// For yt videos and playlists
	if (matches(parsed.hostname, ytHostnames)) {
		return await ytUrl(query, doShuffle);
	}

	// For open.spotify.com links
	if (matches(parsed.hostname, spotifyHostnames)) {
		return await spotifyUrl(query, doShuffle);
	}

	// Query is just a string
	const song = await safeSong(query, maxDuration);
	if (typeof song === 'string') return song;
	return [song];
}

// Handles YouTube playlists and videos and returns a SongData[] object
async function ytUrl(query: string, doShuffle: boolean = true): Promise<SongData[] | string> {
	const pathname = new URL(query).pathname;

	if (pathname === '/watch') {
		const nav_end = await YouTubeAgent.innertube.resolveURL(query)

		const song: SongData[] | string = await YouTubeAgent.innertube.getBasicInfo(nav_end.payload.videoId)
			.then(data => {
				const vid = data;
				return [new SongData({ title: vid.basic_info.title!, urlYT: vid.basic_info.url_canonical! }, 'youtube')];
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
					return new SongData({ title: video.title, urlYT: video.shortUrl }, 'youtube');
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
			return (doShuffle ? shuffle(tracks) : tracks);
		}
	}
	else {
		return 'The video/playlist seems to be private or doesn\'t exist.';
	}
}

// Handles Spotify tracks, albums, and playlits and returns a SongData[] object
async function spotifyUrl(query: string, doShuffle: boolean = true): Promise<SongData[] | string> {
	// This one is a little different because the module works with:
	// Albums, Tracks, Playlists & Artists

	const result: SongData[] | string = await getData(query).then((data: any) => {
		if (data.type === 'track') {
			// Only able to get title and artist
			const artists = ' by ' + data.artists.map((a: any) => a.name).join(' ');

			return [new SongData(data.title + artists, 'spotify')];
		}
		else {
			const songs: SongData[] = data.trackList.map((track: any) => {
				// Return song data object per track
				// Only take first artist name
				return new SongData(track.title + ' by ' + track.subtitle, 'spotify');
			});

			return (doShuffle ? shuffle(songs) : songs);
		}
	}).catch((err : any) => {
		console.warn(err);
		return `spotify-url-info (what allows me to retrieve info from spotify) 
				is giving me headaches, try again later. \n
				P.S. I can't read info from private stuff!!!'`;
	});

	return result;
}

export { handleQuery, ytUrl, spotifyUrl };
