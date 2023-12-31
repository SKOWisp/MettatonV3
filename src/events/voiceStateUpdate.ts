import { Collection, Events, GuildMember, VoiceState } from 'discord.js';
import { LooseClient } from '../LooseClient';
import 'dotenv/config';
import { ServerQueue } from '../voice/serverQueue';

module.exports = {
	name: Events.VoiceStateUpdate,
	once: false,
	async execute(oldState: VoiceState, _: VoiceState) {
		/**
		 * Auto-disconnects bot from voice channel when no members present
		 */

		// Return if  server has no serverQueue
		const client = (oldState.client as LooseClient);
		const serverQueue = client.queues.get(oldState.guild.id);
		if (!serverQueue) return;

		// Get voice channel in which the bot is
		const voiceChannelId = serverQueue.voiceConnection.joinConfig.channelId!;
		const voiceChannel = oldState.guild.channels.cache.get(voiceChannelId);

		// Stupid 'ThreadMemberManager' dumbassery >:(
		const voiceChannelMems = (voiceChannel!.members as Collection<string, GuildMember>);

		// Check if there are non-bot users in the voice channel
		let users = false;
		for (const member of voiceChannelMems.values()) {
			if (member.user.bot === false) {
				users = true;
				break;
			}
		}

		if (!users) {
			// Initiate auto-disconnect countdown if no users in channel
			console.log('Auto-disconnect countdown started');

			serverQueue.timeoutID = setTimeout(
				disconnectBot,
				1000 * 60 * Number(process.env.TOLERANCE),
				serverQueue, client.queues);
		}
		else if (serverQueue.timeoutID) {
			// Stop countdown otherwise
			console.log('Countdown stopped...');

			clearTimeout(serverQueue.timeoutID!);
			serverQueue.timeoutID = null;
		}

	},
};

async function disconnectBot(serverQueue: ServerQueue, queues: Collection<string, ServerQueue>) {
	// Maybe the bot has already been disconnected, so we gotta check
	if (!serverQueue) return;
	serverQueue.eraseQueue();
	queues.delete(serverQueue.voiceConnection.joinConfig.guildId);

	// NADEKO
	await serverQueue.textChannel.send({ content: 'https://media.tenor.com/doD0ciSXEFEAAAAC/monogatari-nadeko-sengoku.gif' });
	serverQueue.textChannel.send('Um...i-i should go now. G-Goodbye!');
}