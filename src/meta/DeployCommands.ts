import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

// Grab all the command files from the commands directory
const foldersPath = path.join(import.meta.url, 'commands');
const generalCommandFolders = fs.readdirSync(foldersPath);

// Remove bot owner commands directory
const ownerCommandFolders = generalCommandFolders.splice(generalCommandFolders.indexOf('owner'), 1);

/**
 * Reads command files from command folders
 * @param {string[]} folders Folder paths that contain commands
 * @returns {never[]} Array of commands
 * @private
 */
function ReadCommandFolders(folders: string[]): never[] {
	const commands: never[] = [];

	for (const folder of folders) {
		

		// Grab all the command files from the commands directoryr
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

		// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				commands.push(command.data.toJSON() as never);
			}
			else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}

	return commands
}

const generalCommands = ReadCommandFolders(generalCommandFolders);
const ownerCommands = ReadCommandFolders(ownerCommandFolders);

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.BOT_TOKEN!);

// Depoly commands in guild
(async () => {
	try {
		console.log(`Started refreshing ${generalCommands.length} general application and ${ownerCommands.length} bot owner (/) commands.`);

		// Refresh owner commands in specific guild
		const data1: any = await rest.put(
			Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
			{ body: ownerCommands },
		);
		
		// Refresh all other commands
		const data2: any = await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID!),
			{ body: generalCommands },
		);


		console.log(`Successfully reloaded ${data2.length} general application and ${data1.length} bot owner (/) commands.`);
	}
	catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();