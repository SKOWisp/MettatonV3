import {
	entersState,
	joinVoiceChannel,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { SlashCommandBuilder, GuildMember, Message } from 'discord.js';
import { ServerQueue } from '../../voice/serverQueue';
import { SongData } from '../../voice/SongData';
import { Track } from '../../voice/Track';
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
		const tracks: string[] | string = await handleQuery((interaction.options as any).getString('song'));

		// A lone string means handleQuery threw an error
		if (typeof tracks === 'string') {
			return interaction.followUp(tracks as string);
		}

		// If a serverQueue exists and is alive, we add the songs, otherwise it's reset
		if (serverQueue && serverQueue.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
			const trackArray = createTrackArray(tracks, interaction);
			serverQueue.enqueue(trackArray);
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
			const trackArray = createTrackArray(tracks, interaction);
			// Enqueue the track(s) and reply a success message to the user
			serverQueue.enqueue(trackArray);
			return interaction.followUp(`${tracks[0]} has been added to the queue.`);
		}
		catch (error) {
			console.log(error);
			return interaction.editReply(`Failed to play "${tracks[0]}", please try again later!`);
		}
	},
};
function createTrackArray(tracks: string[], interaction: LooseCommandInteraction) {
	const newArray = [];
	for (let i = 0; i < tracks.length; i++) {
		// Dunno if there is a better way to store the playMessage object :(
		// But hey it works :D
		let playMessage: Message<boolean> | void;

		// Create track objects
		const track = Track.from(tracks[i], {
			async onStart(song: SongData) {
				playMessage = await interaction.channel!.send(`Now playing: ${song.title}`).catch(console.warn);
			},
			onFinish(song: SongData) {
				console.log(`Song ${song.title} has ended`);
				if (playMessage) playMessage.delete().catch(console.warn);
			},
		});
		newArray.push(track);
	}
	return newArray;
}
