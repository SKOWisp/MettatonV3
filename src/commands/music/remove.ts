import { GuildMember, ChatInputCommandInteraction, SendableChannels, SlashCommandBuilder } from 'discord.js';
import { LooseCommandInteraction } from '../..';

export default {
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Removes a song from the /queue.')
		.addIntegerOption(option =>
			option.setName('position')
				.setDescription('Queue position of the song to remove.')
				.setRequired(true)),
	async execute(interaction: LooseCommandInteraction & ChatInputCommandInteraction<'cached'>) {

		const channel = (interaction.member as GuildMember).voice.channel;
		const serverQueue = interaction.client.queues.get(interaction.guildId!);

		// Return if there is no severQueue object
		if (!serverQueue) return interaction.reply({ content: `There is nothing playing on ${interaction.guild!.name}. (?)`, ephemeral: true });

		if (!channel || channel.id !== serverQueue.voiceConnection.joinConfig.channelId) {
			return interaction.reply({ content: 'Join the voice channel first!.', ephemeral: true });
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
			return (interaction.channel as SendableChannels).send('*\\*zzZZZzzz...\\** (nadeko doesn\'t have anything to remove)');
		}

		// Call the remove function and save the message

		const info = serverQueue.remove(pos);
		// Stop current song if pos is 1
		// Leave channel if no songs left
		if (pos === 1) {
			if (queueLength === 0) {
				serverQueue.eraseQueue();
				interaction.client.queues.delete(interaction.guildId!);
			}

			await interaction.reply({ content: 'https://media1.tenor.com/m/dRpsv_G8zHwAAAAC/monogatari-monogatari-series.gif' });
			return (interaction.channel as SendableChannels).send(info);
		}

		return interaction.reply({ content: `Removed song #${pos}: ${info}.` });
	},
};