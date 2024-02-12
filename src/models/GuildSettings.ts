import { Sequelize, DataTypes } from 'sequelize';

/**
 * TODO
 * @typedef {Object} VoiceSettings
 * @prop {boolean} [settings.shuffle=true] Whether to shuffle added playlists
 * @prop {number} [settings.maxSongs=150] Skip the playing song (if exists) and play the added playlist instantly
 * @prop {number} [settings.autodisconnectTolerance=180] Position of the song/playlist to add to the queue,
 * <= 0 to add to the end of the queue.
 */
type VoiceSettings = {
	shuffle: boolean,
	maxSongs: number,
	disconnectTimeout: number,
}

type FilterSettings = {
	nya: boolean,
	uwu: boolean,

}
export type GuildSettings = {
	voiceSettings?: VoiceSettings,
	FilterSettings?: FilterSettings
}

// Default settings
const defaultVoice: VoiceSettings = {
	shuffle: true,
	maxSongs: 150,
	disconnectTimeout: 180,
};
const defaultFilter: FilterSettings = {
	nya: true,
	uwu: true,
};


module.exports = (sequelize: Sequelize) => {
	return (sequelize.define('guild_settings', {
		guild_id: {
			type: DataTypes.STRING,
			// Value must be unique and can't be null
			primaryKey: true,
		},
		voice: {
			type: DataTypes.JSON,
			defaultValue: JSON.stringify(defaultVoice),
			allowNull: false,
		},
		filter: {
			type: DataTypes.JSON,
			defaultValue: JSON.stringify(defaultFilter),
			allowNull: false,
		},
	}, {
		timestamps: false,
	}));
};