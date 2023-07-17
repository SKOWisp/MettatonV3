import { Events, GuildMember } from 'discord.js';
import { LooseCommandInteraction } from '../LooseClient';

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction: LooseCommandInteraction) {
		/**
		 * As the name implies, executes slash commands when a
		 * InteractionCreate event occurs.
		 */

		if (!interaction.isChatInputCommand() || !(interaction.member instanceof GuildMember)) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching /${interaction.commandName} was found.`);
			return;
		}

		try {
			console.log(`Executing /${interaction.commandName}`);
			await command.execute(interaction);
		}
		catch (error) {
			console.error(`Error executing /${interaction.commandName}`);
			console.error(error);
		}
	},
};