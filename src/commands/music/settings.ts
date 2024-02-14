import { ChatInputCommandInteraction, SlashCommandBuilder, CacheType } from 'discord.js';
import { FilterSettings, LooseCommandInteraction, VoiceSettings } from '../..';
import { MettatonMessage } from '../..';

import 'dotenv/config';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('List or modify Mettaton server settings.')
		.addSubcommand(subcommand => subcommand
			.setName('voice')
			.setDescription('Modify voice settings.')

			.addBooleanOption(option => option
				.setName('shuffle')
				.setDescription('Whether to pre-shuffle songs added from playlists.')
				.setRequired(false))
			.addIntegerOption(option => option
				.setName('max_songs')
				.setDescription('Max number of songs that the queue can have.')
				.setMaxValue(Number(process.env.MAX_SONGS))
				.setMinValue(10)
				.setRequired(false))
			.addIntegerOption(option => option
				.setName('dc_tolerance')
				.setDescription('Seconds of tolerance before auto-disconnecting.')
				.setMaxValue(Number(process.env.TOLERANCE))
				.setMinValue(5)
				.setRequired(false)))

		.addSubcommand(subcommand => subcommand
			.setName('filter')
			.setDescription('Modify filter settings.')
			.addBooleanOption(option => option
				.setName('uwu')
				.setDescription('Whether to filter uwu or not.')
				.setRequired(false))
			.addBooleanOption(option => option
				.setName('nya')
				.setDescription('Whether to filter nya or not.')
				.setRequired(false)))

		.addSubcommand(subcommand => subcommand
			.setName('show')
			.setDescription('Shows server settings.')),

	async execute(i: LooseCommandInteraction & ChatInputCommandInteraction<CacheType>) {
		// This may take a while to execute on a Pi
		await i.deferReply();

		// Get settings can't be null because we check in interactionCreate.ts
		const guildId = i.guildId!;
		const settings = i.client.guildSettings.get(guildId)!;
		let changed: boolean = false;

		if (i.options.getSubcommand() === 'voice') {
			const prevVoice = settings.voice;

			// Create new VoiceSettings object
			// Keeps unmodified values
			const newVoice: VoiceSettings = {
				shuffle: i.options.getBoolean('shuffle') ?? prevVoice.shuffle,
				maxSongs: (i.options as any).getInteger('max_songs') ?? prevVoice.maxSongs,
				disconnectTimeout: (i.options as any).getInteger('dc_tolerance') ?? prevVoice.disconnectTimeout,
			};

			// Check if there were any changes
			if (JSON.stringify(newVoice) !== JSON.stringify(prevVoice)) {
				settings.voice = newVoice;
				await settings.save().catch(e => console.log(e));

				console.log('New VoiceSettings saved:', settings.dataValues.voice);
				changed = true;
			}
		}
		else if (i.options.getSubcommand() === 'filter') {
			const prevFilter = settings.filter;

			const newFilter: FilterSettings = {
				uwu: i.options.getBoolean('uwu') ?? prevFilter.uwu,
				nya: (i.options as any).getInteger('nya') ?? prevFilter.nya,
			};

			if (JSON.stringify(newFilter) !== JSON.stringify(prevFilter)) {
				settings.filter = newFilter;
				await settings.save().catch(e => console.log(e));

				console.log('New FilterSettings saved:', settings.dataValues.filter);
				changed = true;
			}
		}

		// Show settings
		const emoji = MettatonMessage.randomEmoji();
		const content = emoji + `  ***${changed ? 'New' : 'Current'}*** Settings:  ` + emoji;
		const embeds = MettatonMessage.createSettingsEmbeds(settings, i.guild!);

		return i.followUp({ content, embeds });
	},
};