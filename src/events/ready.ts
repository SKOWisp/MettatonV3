import { ActivityType, Events } from 'discord.js';
import { LooseClient } from '../LooseClient';

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client: LooseClient) {
		if (!client.user || !client.application) {
			return;
		}
		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setActivity('/play', { type: ActivityType.Listening });
	},
};
