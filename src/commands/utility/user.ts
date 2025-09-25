import { SlashCommandBuilder, ChatInputCommandInteraction, SendableChannels } from 'discord.js';
import 'dotenv/config';


export default {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Returns username.'),
	async execute(interaction: ChatInputCommandInteraction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		const username = interaction.user.username;
		if (username === process.env.DEGEN) {
			await interaction.reply({ content: 'https://tenor.com/view/senjougahara-senjou-gahara-upset-grimace-gif-25802175' });
			return (interaction.channel as SendableChannels).send(`Oh, so it's ${username}...`);
		}
		else {
			interaction.reply(`This command was run by ${interaction.user.username}.`);
		}
	},
};
