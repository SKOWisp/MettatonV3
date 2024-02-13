import { ActivityType, Events } from 'discord.js';
import { LooseClient } from '..';
import { GuildSettings } from '..';

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client: LooseClient) {
		if (!client.user || !client.application) {
			return;
		}

		// Load guild settings
		const storedSettings = await GuildSettings.findAll();
		storedSettings.forEach(b => client.guildSettings.set(b.guild_id, b));

		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setActivity('/play', { type: ActivityType.Listening });
	},
};
