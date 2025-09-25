import {
	Sequelize,
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
} from 'sequelize';


/**
 * Guild Voice Settings
 * @typedef {Object} VoiceSettings
 * @prop {boolean} shuffle Whether to shuffle added playlists.
 * @prop {number} maxSongs The maximum number of songs that can be added to the queue.
 * @prop {number} disconnectTimeout Time in seconds the bot will remain in an empty voice channel
 * @prop {number} maxDuration Max song duration to use as filter with ytsr
 */
export type VoiceSettings = {
	readonly shuffle: boolean,
	readonly maxSongs: number,
	readonly disconnectTimeout: number,
	readonly maxDuration: number,
}

export type FilterSettings = {
	readonly nya: boolean,
	readonly uwu: boolean,

}

// Default settings
const defaultVoice: VoiceSettings = {
	shuffle: true,
	maxSongs: 150,
	disconnectTimeout: 180,
	maxDuration: 60 * 60 * 10 + 1,
};
const defaultFilter: FilterSettings = {
	nya: true,
	uwu: true,
};

export interface IGuildSettings extends Model<InferAttributes<IGuildSettings>, InferCreationAttributes<IGuildSettings>> {
	// Some fields are optional when calling UserModel.create() or UserModel.build()
	guild_id: string;
	voice: CreationOptional<VoiceSettings>;
	filter: CreationOptional<FilterSettings>;
}

export default (sequelize: Sequelize) => {
	return (sequelize.define<IGuildSettings>('GuildSettings', {
		guild_id: {
			type: DataTypes.STRING,
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