import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('foo')
		.setDescription('Test command'),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply('bar');
	},
};
