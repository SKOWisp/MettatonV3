import { ActivityType, Events } from 'discord.js';
import { LooseClient } from '..';

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client: LooseClient) {
		if (!client.user || !client.application) {
			return;
		}
		console.log(`Ready! Logged in as ${client.user.tag}`);
		console.log(client.guilds.cache);
		client.user.setActivity('/play', { type: ActivityType.Listening });
	},
};
