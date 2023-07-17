import {
	entersState,
	joinVoiceChannel,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { SlashCommandBuilder, GuildMember } from 'discord.js';
import { ServerQueue } from '../../voice/serverQueue';
import { SongData } from '../../voice/SongData';
import { LooseCommandInteraction } from '../../LooseClient';
import { handleQuery } from '../../utils/handleQuery';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Looks up a query and adds it to the queue.')
		.addStringOption(option =>
			option.setName('song')
				.setDescription('Query or url.')
				.setRequired(true)),
	async execute(interaction: LooseCommandInteraction) {
		// This will take a while, so the reply is deferred
		await interaction.deferReply();

		const channel = (interaction.member as GuildMember).voice.channel;

		// Return if member isn't connected to voice
		if (!channel) {
			return interaction.followUp('Join a voice channel!');
		}

		// We'll be using this a bit
		const client = interaction.client;
		let serverQueue = client.queues.get(interaction.guildId!);


		// Dirty 'as any' cast, but we need it since the command hasn't been built.
		const songs: SongData[] | string = await handleQuery((interaction.options as any).getString('song'));

		// A lone string means handleQuery threw an error
		if (typeof songs === 'string') {
			return interaction.followUp(songs as string);
		}

		// If a serverQueue exists and is alive, we add the songs, otherwise it's reset
		if (serverQueue && serverQueue.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
			serverQueue.enqueue(songs);
			return interaction.followUp('The songs have been added');
		}
		else {
			client.queues.delete(interaction.guildId!);
		}

		// Create a new server queue object otherwise
		serverQueue = new ServerQueue(
			joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator,
				selfDeaf: true,
			}),
			interaction.channel!,
		);


		// Error event handling
		serverQueue.voiceConnection.on('error', console.warn);

		// serverQueue saved
		client.queues.set(interaction.guildId!, serverQueue);

		// Make sure the connection is ready before processing the user's request
		try {
			entersState(serverQueue.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
		}
		catch (error) {
			console.warn(error);
			return interaction.followUp('Failed to join voice channel within 20 seconds, please try again later!');
		}

		try {
			// Enqueue the track(s) and reply a success message to the user
			serverQueue.enqueue(songs);
			return interaction.followUp(`${songs[0].title} has been added to the queue.`);
		}
		catch (error) {
			console.log(error);
			return interaction.editReply(`Failed to play "${songs[0].title}", please try again later!`);
		}
	},
};