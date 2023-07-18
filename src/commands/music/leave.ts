import { SlashCommandBuilder, GuildMember } from 'discord.js';
import { LooseCommandInteraction } from '../../LooseClient';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Stops playback and kicks the bot from the vc.'),
	async execute(interaction: LooseCommandInteraction) {

		const channel = (interaction.member as GuildMember).voice.channel;
		const serverQueue = interaction.client.queues.get(interaction.guildId!);

		// Return if there is no severQueue object
		if (!serverQueue) return interaction.reply({ content: `There is nothing playing on ${interaction.guild!.name}. (?)`, ephemeral: true });

		if (!channel || channel.id !== serverQueue.voiceConnection.joinConfig.channelId) {
			return interaction.reply({ content: 'Join the voice channel first!.', ephemeral: true });
		}

		/*
			Destroying connection
		*/
		serverQueue.eraseQueue();
		interaction.client.queues.delete(interaction.guildId!);
		interaction.reply('https://media.tenor.com/ZM5OI7aKq4QAAAAC/monogatari-nadeko-sengoku.gif');
	},
};