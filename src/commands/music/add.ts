import { SlashCommandBuilder, GuildMember } from 'discord.js';
import {
	LooseCommandInteraction,
	ytHostnames,
	spotifyHostnames,
	validatorOpts,
	safeSong,
	matches,
	ytUrl,
	spotifyUrl,
} from '../..';

import validator from 'validator';
import URLParse from 'url-parse';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add')
		.setDescription('Adds a SINGLE song to the beginning of the queue.')
		.addStringOption(option =>
			option.setName('song')
				.setDescription('Query or url.')
				.setRequired(true)),
	async execute(interaction: LooseCommandInteraction) {
		// Defer reply to processs request
		await interaction.deferReply();

		const channel = (interaction.member as GuildMember).voice.channel;
		const serverQueue = interaction.client.queues.get(interaction.guildId!);

		// Return if there is no severQueue object
		if (!serverQueue) {
			return interaction.followUp({
				content: `There is nothing playing on ${interaction.guild!.name}! Use /play instead.`,
			});
		}

		// Return if user is not in voice channel
		if (!channel || channel.id !== serverQueue.voiceConnection.joinConfig.channelId) {
			return interaction.followUp({ content: 'Join the voice channel first!.', ephemeral: true });
		}

		if (serverQueue.isFull()) {
			return interaction.followUp('The server\'s song queue is full! Skip or remove songs before adding more.');
		}

		/*
			Adding song to the beginning of the queue
		*/

		const query: string = (interaction.options as any).getString('song').trim();

		// Query is an invalid link
		if (validator.isURL(query) && !validator.isURL(query, validatorOpts)) {
			return interaction.followUp('I do not handle that page');
		}

		// Query isn't a url
		if (!validator.isURL(query)) {
			const song = await safeSong(query);
			if (!song) return interaction.followUp('ytsr (looking up your query in yt) is giving me headaches, try again in a sec.');

			serverQueue.enqueue([song], true);
			// In case /add is used when nothing is playing
			if (!serverQueue.currentSong) serverQueue.enqueue();
			return interaction.followUp(`${song.name} is now next in the queue.`);
		}

		// Parse query as a URL for convenience
		const parsed = new URLParse(query);
		// Shorten pathname (for spotify links)
		const pathname = parsed.pathname.split('/')[1];

		// Query is from a valid hostname, but invalid type
		if (matches(pathname, ['playlist', 'album', 'artist'])) {
			return interaction.followUp('This command is for a single song. Use a /watch link for yt or a /track link for spotify instead.');
		}

		// Query is a yt link
		if (matches(parsed.hostname, ytHostnames)) {
			const song = await ytUrl(query);
			if (typeof song === 'string') return interaction.followUp(song);

			serverQueue.enqueue(song, true);
			// In case /add is used when nothing is playing
			if (!serverQueue.currentSong) serverQueue.enqueue();
			return interaction.followUp(`${song[0].name} is now next in the queue.`);
		}

		// Query is a spotify link
		if (matches(parsed.hostname, spotifyHostnames)) {
			const song = await spotifyUrl(query);
			if (typeof song === 'string') return interaction.followUp(song);

			serverQueue.enqueue(song, true);
			// In case /add is used when nothing is playing
			if (!serverQueue.currentSong) serverQueue.enqueue();
			return interaction.followUp(`${song[0].name} is now next in the queue.`);
		}

		return interaction.followUp('Something went terribly wrong');
	},
};