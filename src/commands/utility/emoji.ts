import { SlashCommandBuilder } from 'discord.js';
import { LooseCommandInteraction } from '../..';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('emoji')
		.setDescription('Prints server\'s emojis.')
		.addStringOption(option =>
			option.setName('flag')
				.setDescription('all/anim/static')
				.setRequired(false)),

	async execute(interaction: LooseCommandInteraction) {
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

		let text = `**${guild.name}'s emojis: ** \n` + info[0];
		if (showIDs) {
			text += '\n ** IDs: ** \n' + '```' + info[1] + '```';
		}

		// Reply
		interaction.reply({ content: text, ephemeral: true });
	},
};
