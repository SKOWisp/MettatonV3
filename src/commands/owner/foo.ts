import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('foo')
		.setDescription('Test command'),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply('bar');
	},
};
