import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { MettatonMessage, LooseClient, ServerQueue } from '.';
import { IGuildSettings } from '.';

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { ClientType, SessionOptions } from 'youtubei.js/agnostic';
import { UniversalCache } from 'youtubei.js';
import { YouTubeAgent } from './voice/plugins/YouTubeAgent.js';

// OK
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // WTF

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
		const imported = await import(filePath);
		const command = imported.default;

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
	const imported = await import(filePath);
	const event = imported.default

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
const innertubeOptions: SessionOptions =  {
			cache: new UniversalCache(false), 
			player_id: '0004de42',
			generate_session_locally: true, // Better performance?
			client_type: ClientType.ANDROID // Default
			// 
			};

const cookiesPath = path.join(settingsPath, 'cookies.json');
if (!(fs.existsSync(cookiesPath) && fs.lstatSync(cookiesPath).isFile())) {
	console.warn('No YT cookies file found.');
	YouTubeAgent.CreateYTAgent({ innertubeOptions: innertubeOptions });
}
else {
	const ytCookies = fs.readFileSync(cookiesPath, 'utf8');
	YouTubeAgent.CreateYTAgent({ 
		cookies: JSON.parse(ytCookies), 
		innertubeOptions: innertubeOptions
		});
}

void lClient.login(process.env.BOT_TOKEN);