import { Sequelize, ModelStatic } from 'sequelize';
import { IGuildSettings, VoiceSettings, FilterSettings } from '.';

const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});

// Load models
const GuildSettings: ModelStatic<IGuildSettings> = (await import('./models/GuildSettings.js')).default(sequelize);

/*
	We 'objectify' the db data.
	To modify the nested properties you have pass a complete VoiceSettings/FilterSettings object
*/
Object.defineProperties(GuildSettings.prototype,
	{
		'voice': {
			get: function() {
				console.log('Voice settings parsed and read');
				return JSON.parse(this.getDataValue('voice'));
			},
			set: function(newVal: VoiceSettings) {
				this.setDataValue('voice', JSON.stringify(newVal));
			},
		},
		'filter': {
			get: function() {
				return JSON.parse(this.getDataValue('filter'));
			},
			set: function(newVal: FilterSettings) {
				this.setDataValue('filter', JSON.stringify(newVal));
			},
		},
	});

export { GuildSettings };
