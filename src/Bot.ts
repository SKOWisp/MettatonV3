import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { MettatonMessage, LooseClient, ServerQueue } from '.';
import { IGuildSettings } from '.';

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { YouTubeAgent } from './voice/plugins/YouTubeAgent';

console.log('Bot is starting...');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildEmojisAndStickers,
	],
});

// Adds properties to existing client object
const lClient: LooseClient = Object.assign(client, client, {
	commands: new Collection<string, any>(),
	queues: new Collection<string, ServerQueue>(),
	guildSettings: new Collection<string, IGuildSettings>(),
});

// Loading commands from the command folder, and each subfolder
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
const extension = __filename.split('.').pop();

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(extension!));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);

		if ('data' in command && 'execute' in command) {
			lClient.commands.set(command.data.name, command);
		}
		else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Loading events from event folder
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(extension!));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		lClient.once(event.name, (...args) => event.execute(...args));
	}
	else {
		lClient.on(event.name, (...args) => event.execute(...args));
	}
}

// Loading emojis
const settingsPath = path.resolve(__dirname, '..');
MettatonMessage.LoadEmojis(path.join(settingsPath, 'emojis.txt'));

// Loading cookies
const cookiesPath = path.join(settingsPath, 'cookies.json');
if (!(fs.existsSync(cookiesPath) && fs.lstatSync(cookiesPath).isFile())) {
	console.warn('No YT cookies file found.');
	YouTubeAgent.CreateYTAgent();
}
else {
	const ytCookies = fs.readFileSync(cookiesPath, 'utf8');
	YouTubeAgent.CreateYTAgent({ cookies: JSON.parse(ytCookies) , ytdlOptions: {playerClients: ['ANDROID']}});
}

void lClient.login(process.env.BOT_TOKEN);