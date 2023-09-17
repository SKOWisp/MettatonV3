import { BaseMessageOptions, Embed } from 'discord.js';
import { SongData } from '..';
import { getAverageColor } from 'fast-average-color-node';


const playEmojis = [
	'<a:HaneMeow:1152766278927388753>',
	'<a:KanbaHappy:1152766299596918886>',
	'<a:HanePat:1152776181796569279>',
	'<a:MayoiPlush:1152776197483274290>',
	'<a:CatJam:1152777370990813274>',
	'<a:ShinoJam:1152778800942305280>',
];

export async function createPlayMessage(metadata: SongData): Promise<BaseMessageOptions> {

	const hexColor: number | void = await getAverageColor(metadata.thumnailURL!,
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

	const date = new Date(Number(metadata.duration) * 1000);
	let hms: string;
	if (Number(metadata.duration) < 3600) {
		hms = date.toISOString().slice(14, 19);
	}
	else {
		hms = date.toISOString().slice(11, 19);
	}

	/*
	 * Add random emoji to the message
	 */
	const emoji = playEmojis[Math.floor((Math.random() * playEmojis.length))];
	const content = emoji + ' ** Now playing: ** ' + emoji;


	let name = metadata.name;

	// Shorten the YT video title if needed
	if (metadata.name.length > 37) {
		let parts = metadata.name.split(/[-|]|(?<=\s)by(?=\s)/g);

		parts = parts.map(p => p.trim());
		name = parts.join('\n');
	}


	/*
	 * Cool play embed B)
	 */
	let embeds: any = {
		color: hexColor ? hexColor : 0xfdfdfd,
		author: {
			name: `${metadata.author.name}`,
			iconURL: `${metadata.author.avatarURL}`,
			url: `${metadata.author.pageURL}`,
		},
		description: `[\`${name}\`](${metadata.urlYT}) \n `,
		image: {
			url: `${metadata.thumnailURL}`,
		},
		footer: {
			text: `Duration: ${hms}`,
		},
	};

	embeds = [embeds as Embed];

	return { content, embeds };
}