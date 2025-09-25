import { BaseMessageOptions, Embed, Guild } from 'discord.js';
import { getAverageColor } from 'fast-average-color-node';
import { FilterSettings, SongData, VoiceSettings } from '..';
import fs from 'node:fs';

export class MettatonMessage {

	private static playEmojis: string[] = ['★★★'];

	/**
	 * Loads emojis from a .txt file
	 * @param {string} path Path of the file
	 */
	static LoadEmojis(path: string): void {
		if (!(fs.existsSync(path) && fs.lstatSync(path).isFile() && path.endsWith('.txt'))) {
			return console.warn('MettatonMessage: Provide a valid emoji file path.');
		}

		const data = fs.readFileSync(path, 'utf8');
		if (!data) return;

		this.playEmojis = data.split('\n').map(item => item.trim());
	}

	/**
	 * Returns a random emoji string from the loaded emojis file.
	 * @returns {string}
	 */
	static randomEmoji(): string {
		return this.playEmojis[Math.floor((Math.random() * this.playEmojis.length))];
	}

	/**
	 * Creates a custom play message for a yt song
	 * @param {SongData} metadata yt url of the video
	 * @returns {BaseMessageOptions}
	 */
	static async createPlayMessage(metadata: SongData): Promise<BaseMessageOptions> {

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
		const emoji = this.randomEmoji();
		const content = emoji + ' ** Now playing: ** ' + emoji;


		let name = metadata.title;

		// Shorten the YT video title if needed
		if (metadata.title.length > 37) {
			let parts = metadata.title.split(/[-|]|(?<=\s)by(?=\s)/g);

			parts = parts.map(p => p.trim());
			name = parts.join('\n');
		}


		/*
		 * Cool play embed B)
		 */
		let embeds: any = {
			color: hexColor ? hexColor : 0xfdfdfd,
			author: metadata.author ,
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

	/**
	 * Creates the settings embeds
	 * @param {IGuildSettings} settings The guild settings.
	 * @param {Guild} guild Guild object to get data from.
	 * @returns {Embed[]}
	 */
	static createSettingsEmbeds(settings: { voice: VoiceSettings, filter: FilterSettings}, guild: Guild): Embed[] {
		// Settings embed
		let embeds: any = {
			color: 0,
			author: {
				name: `${guild.name}`,
				iconURL: `${guild.iconURL()}`,
				url: '',
			},
			description: '`Mettaton Settings`',
			fields: [
				{
					'name': '** Voice **',
					'value': `* shuffle: ${settings.voice.shuffle}\n` +
						`* maxDuration: ${settings.voice.maxDuration}\n` +
						`* maxSongs: ${settings.voice.maxSongs}\n` +
						`* disconnectTimeout: ${settings.voice.disconnectTimeout}`,
					'inline': true,
				},
				{
					'name': '** Filters **',
					'value': `* uwu: ${settings.filter.uwu}\n` +
						`* nya: ${settings.filter.nya}`,
					'inline': true,
				},
			],
		};

		embeds = [embeds as Embed];
		return embeds;
	}
}