import { Events, GuildMember } from 'discord.js';
import { LooseCommandInteraction, GuildSettings } from '..';

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction: LooseCommandInteraction) {
		/**
		 * As the name implies, executes slash commands when a
		 * InteractionCreate event occurs.
		 */
		if (!interaction.isChatInputCommand() || !(interaction.member instanceof GuildMember)) return;

		// Check if guild settings exist
		const guildId = interaction.guildId!;
		const settings = interaction.client.guildSettings.has(guildId);

		// Create new db entry and save in memory if none found
		if (!settings) {
			console.log(`New guild settings added: ${guildId}`);
			const newSettings = await GuildSettings.create({ guild_id: guildId });
			interaction.client.guildSettings.set(guildId, newSettings);
		}

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