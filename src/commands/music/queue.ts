import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { LooseCommandInteraction } from '../..';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Displays the server\'s queue.'),
	execute(interaction: LooseCommandInteraction) {
		const serverQueue = interaction.client.queues.get(interaction.guildId!);

		// Return if there is no severQueue object
		if (!serverQueue || !serverQueue.queue.length) return interaction.reply({ content: `There is nothing playing on ${interaction.guild!.name}. (?)`, ephemeral: true });

		/*
				Printing queue
		*/
		let i = 1;
		const titles = serverQueue.queue.map(track => {
			i++;
			return i + '.- ' + track.name;
		});

		const numSongs = titles.unshift('**CURRENT SONG:** ' + (serverQueue.currentSong ? serverQueue.currentSong.name : '---'));
		let description = titles.slice(0, 19).join('\n');
		if (numSongs > 19) {
			const difference = numSongs - 19;
			description = description + `\n plus ${difference} more...`;
		}

		const embed = new EmbedBuilder()
			.setColor(Number('0x29d1ea'))
			.setTitle('Queue: ')
			.setDescription(description);


		return interaction.reply({ embeds: [embed], ephemeral: true });
	},
};