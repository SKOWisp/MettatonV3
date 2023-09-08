import { Embed } from 'discord.js';
import { SongData } from '../voice/SongData';
import { getAverageColor } from 'fast-average-color-node';
import { performance } from 'perf_hooks';

export async function CreatePlayEmbed(metadata: SongData): Promise<Embed> {
	const startTime = performance.now();
	const hexColor: number | void = await getAverageColor(metadata.thumbnail!,
		{
			mode: 'speed',
			algorithm: 'dominant',

		})
		.then(color => {
			return colorToSigned24Bit(color.hex);
		})
		.catch(e => {
			console.warn(e);
		});


	const url: string = 'https://www.youtube.com/watch?v=' + metadata.id;
	const embed: any = {
		color: hexColor ? hexColor : 0xfdfdfd,
		url: 'https://discord.js.org',
		author: {
			name: `${metadata.author}`,
			iconURL: `${metadata.avatar}`,
			url: `${metadata.authorUrl}`,
		},
		description: `[${metadata.title}](${url})`,
		thumbnail: {
			url: `${metadata.thumbnail}`,
		},
	};

	const endTime = performance.now();
	console.log(`fast-average-color took ${endTime - startTime} milliseconds`);

	return embed as Embed;
}

function colorToSigned24Bit(s: string) {
	return (parseInt(s.substring(1), 16) << 8) / 256;
}