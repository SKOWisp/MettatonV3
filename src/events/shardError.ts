import { Events } from 'discord.js';

export default {
	name: Events.ShardError,
	execute(error: Error) {
		console.error('A websocket connection encountered an error:', error);
	},
};
