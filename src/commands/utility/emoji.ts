import { SendableChannels, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { LooseCommandInteraction } from '../..';
import { splitString } from '../..';

export default {
	data: new SlashCommandBuilder()
		.setName('emoji')
		.setDescription('Prints server\'s emojis.')
		.addStringOption(option =>
			option.setName('flag')
				.setDescription('all/anim/static')
				.setRequired(false)),

	execute(interaction: LooseCommandInteraction & ChatInputCommandInteraction<'cached'>) {
		const guild = interaction.guild!;

		// Get flags
		const flag = (interaction.options as any).getString('flag');

		let showIDs: boolean = false;
		let check: boolean | null = null;
		if (flag === 'anim') {
			check = true;
		}
		else if (flag === 'static') {
			check = false;
		}
		else if (flag === 'all') {
			showIDs = true;
		}

		// Decide whether to filter or not
		let emojis = Array.from(guild.emojis.cache.values());
		if (check !== null) {
			emojis = emojis.filter(e => e.animated === check);
			showIDs = true;
		}

		// Generate information strings
		const info: string[] = ['', ''];
		for (const emoji of emojis) {
			const visibleEmoji = `<${(emoji.animated ? 'a' : '')}:${emoji.name}:${emoji.id}>`;
			const description = ` - ${emoji.name}`;

			info[0] += '- ' + visibleEmoji + description + '\n';
			info[1] += visibleEmoji + '\n';
		}


		const firstMessages = splitString(info[0]);
		// Reply
		interaction.reply(`**${guild.name}'s emojis: **`);
		for (const msg of firstMessages) {
			(interaction.channel as SendableChannels).send(msg);
		}

		if (showIDs) {
			const secondMessages = splitString(info[1], { prepend: '\`\`\`\n', append: '\n\`\`\`' });
			(interaction.channel as SendableChannels).send('** IDs: **');
			for (const msg of secondMessages) {
				(interaction.channel as SendableChannels).send(msg);
			}
		}
	},
};
