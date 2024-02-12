import { GuildMember, SlashCommandBuilder } from 'discord.js';
import { LooseCommandInteraction } from '../..';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('Removes a song from the /queue.')
		.addBooleanOption(option =>
			option.setName('shuffle')
				.setDescription('Queue position of the song to remove.')
				.setRequired(false)),
	async execute(interaction: LooseCommandInteraction) {

		const guildId = interaction.guildId!;
		const settings = interaction.client.guildSettings.get(guildId);

		if (settings) {
			// Display information
			return interaction.reply({ content: `Shuffle ${settings.voiceSettings}. (?)`, ephemeral: true });
		}

		const channel = (interaction.member as GuildMember).voice.channel;
		const serverQueue = interaction.client.queues.get(interaction.guildId!);

		// Return if there is no severQueue object
		if (!serverQueue) return interaction.reply({ content: `There is nothing playing on ${interaction.guild!.name}. (?)`, ephemeral: true });

		if (!channel || channel.id !== serverQueue.voiceConnection.joinConfig.channelId) {
			
		}

		/*
			Parse position
			reject negative values and 0
		*/
		let pos: number = (interaction.options as any).getInteger('position');
		pos = ((Number.isNaN(pos) || pos === 0) ? 1 : pos);
		pos = (pos < 0 ? Math.abs(pos) : pos);

		const queueLength = serverQueue.queue.length;

		// Do nothing if there's nothing to do
		if (pos - 1 > queueLength) {
			await interaction.reply({ content: 'https://media1.tenor.com/m/TFFBKrvBc_sAAAAd/zoku-owarimonogatari-serpent.gif' });
			return interaction.channel!.send('*\\*zzZZZzzz...\\** (nadeko doesn\'t have anything to remove)');
		}

		// Stop current song if pos is 1
		// Leave channel if no songs left
		if (pos === 1) {
			serverQueue.audioPlayer.stop();

			if (queueLength === 0) {
				serverQueue.eraseQueue();
				interaction.client.queues.delete(interaction.guildId!);
			}

			await interaction.reply({ content: 'https://media1.tenor.com/m/dRpsv_G8zHwAAAAC/monogatari-monogatari-series.gif' });
			return interaction.channel!.send('use /skip dummy...');
		}

		// Remove song in /queue
		const songName = serverQueue.queue[pos - 2].name;
		serverQueue.queue.splice(pos - 2, 1);

		return interaction.reply({ content: `Removed song #${pos}: ${songName}.` });
	},
};