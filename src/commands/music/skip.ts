import { GuildMember, SlashCommandBuilder } from 'discord.js';
import { LooseCommandInteraction } from '../..';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skips a # of songs in the queue.')
		.addIntegerOption(option =>
			option.setName('skips')
				.setDescription('# of songs to skip.')
				.setRequired(false)),
	async execute(interaction: LooseCommandInteraction) {

		const channel = (interaction.member as GuildMember).voice.channel;
		const serverQueue = interaction.client.queues.get(interaction.guildId!);

		// Return if there is no severQueue object
		if (!serverQueue) return interaction.reply({ content: `There is nothing playing on ${interaction.guild!.name}. (?)`, ephemeral: true });

		if (!channel || channel.id !== serverQueue.voiceConnection.joinConfig.channelId) {
			return interaction.reply({ content: 'Join the voice channel first!.', ephemeral: true });
		}

		/*
			Parse skips,
			default to 1 if 0 or NaN,
			reject negative values
		*/
		let skips: number = (interaction.options as any).getInteger('skips');
		skips = ((Number.isNaN(skips) || skips === 0) ? 1 : skips);
		skips = (skips < 0 ? Math.abs(skips) : skips);

		// Leave voice channel if all remaining songs are skipped
		// Add 1 tu account for current song
		if (skips > serverQueue.queue.length || serverQueue.queue.length === 0) {
			serverQueue.eraseQueue();
			interaction.client.queues.delete(interaction.guildId!);
			await interaction.reply({ content: 'https://media.tenor.com/X5v7RZNp8AwAAAAC/monogatari-monogatari-series.gif' });
			return interaction.channel!.send('why add songs only to skip them?!!?!');
		}

		// Slice queue if necessary
		if (skips > 1) {
			const newArray = serverQueue.queue.slice(skips - 1);
			serverQueue.queue = newArray;
		}
		serverQueue.audioPlayer.stop();
		return interaction.reply({ content: `Skipping ${skips ?? 1} song(s)` });
	},
};