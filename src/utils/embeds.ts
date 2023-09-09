import { Embed } from 'discord.js';
import { SongData } from '../voice/SongData';
import { getAverageColor } from 'fast-average-color-node';

export async function CreatePlayEmbed(metadata: SongData): Promise<Embed> {

	const hexColor: number | void = await getAverageColor(metadata.thumbnail!,
		{
			mode: 'speed',
			algorithm: 'sqrt',
		})
		.then(color => {
			return parseInt(color.hex.replace(/^#/, ''), 16);
		})
		.catch(e => {
			console.warn(e);
		});


	const embed: any = {
		color: hexColor ? hexColor : 0xfdfdfd,
		author: {
			name: `${metadata.author}`,
			iconURL: `${metadata.avatar}`,
			url: `${metadata.authorUrl}`,
		},
		description: `[${metadata.title}](${metadata.url})`,
		thumbnail: {
			url: `${metadata.thumbnail}`,
		},
	};

	return embed as Embed;
}