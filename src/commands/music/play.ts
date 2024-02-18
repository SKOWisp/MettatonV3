import {
	entersState,
	joinVoiceChannel,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { SongData, ServerQueue, LooseCommandInteraction, handleQuery, VoiceSettings } from '../..';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Looks up a query and adds it to the queue.')
		.addStringOption(option =>
			option.setName('song')
				.setDescription('Query or url.')
				.setRequired(true)),
	async execute(interaction: LooseCommandInteraction & ChatInputCommandInteraction<'cached'>) {
		// This will take a while, so the reply is deferred
		await interaction.deferReply();

		const channel = interaction.member.voice.channel;

		// Return if member isn't connected to voice
		if (!channel) {
			return interaction.followUp('Join a voice channel!');
		}

		// We'll be using this a bit
		const client = interaction.client;
		let serverQueue = client.queues.get(interaction.guildId!);
		let settings: VoiceSettings;

		// Get server settings
		if (!serverQueue) {
			/*
				Settings can't be undefined because new servers create them when
				interactionCreate gets called
			*/
			settings = interaction.client.guildSettings.get(interaction.guildId)!.voice;
		}
		else {
			if (serverQueue.isFull()) return interaction.followUp('The server\'s song queue is full! Skip or remove songs before adding more.');
			settings = serverQueue.voiceSettings;
		}

		// Dirty 'as any' cast, but we need it because discord.js typings are funky
		const songs: SongData[] | string = await handleQuery(
			(interaction.options as any).getString('song'),
			settings.shuffle,
			settings.maxDuration,
		);

		// A lone string means handleQuery threw an error
		if (typeof songs === 'string') {
			return interaction.followUp(songs as string);
		}

		// If a serverQueue exists and is alive, we add the songs, otherwise it's reset
		if (serverQueue && serverQueue.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
			const number = serverQueue.enqueue(songs);
			return enqueueReply(interaction, songs, number);
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
			settings,
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

		// Enqueue the track(s) and reply a success message to the user
		// Any errors will arise from playing the song, not from enqueueing it
		const number = serverQueue.enqueue(songs);
		enqueueReply(interaction, songs, number);
	},
};

// Reply to the /play interaction depending on the amount of songs added.
function enqueueReply(interaction: LooseCommandInteraction, songs: SongData[], quantity: number) {
	if (quantity === 1) {
		interaction.followUp(`${songs[0].name} has been added to the queue.`);
	}
	else {
		interaction.followUp((`${songs[0].name}\n + ${quantity - 1} more song(s)  have been added to the queue.`));
	}
}