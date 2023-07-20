import validator from 'validator';
import URLParse from 'url-parse';
import ytpl from 'ytpl';
import ytdl from 'ytdl-core';
import { safeSong } from '../voice/safeSong';
import { SongData } from '../voice/SongData';
import { ytHostnames, spotifyHostnames, validatorOpts } from './hostnames';
import { matches, shuffle } from './utils';

// spotify-url-info modules
const fetch = require('isomorphic-unfetch');
const { getData } = require('spotify-url-info')(fetch);

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

	const parsed = new URLParse(query);

	// For yt videos and playlists
	if (matches(parsed.hostname, ytHostnames)) {
		return await ytUrl(query);
	}

	// For open.spotify.com links
	if (matches(parsed.hostname, spotifyHostnames)) {
		return await spotifyUrl(query);
	}

	// Query is just a string
	const song = await safeSong(query);
	if (!song) return 'ytsr (looking up your query in yt) is giving me headaches, try again in a sec.';
	return [song];
}

// Handles YouTube playlists and videos and returns a SongData[] object
async function ytUrl(query: string): Promise<SongData[] | string> {
	const pathname = new URL(query).pathname;

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
			return shuffle(songs);
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
