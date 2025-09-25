import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Shows the bot\'s ping.'),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply(`Websocket heartbeat: ${interaction.client.ws.ping}ms.`);
	},
};
