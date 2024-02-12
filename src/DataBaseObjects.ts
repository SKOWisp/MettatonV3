import { Sequelize } from 'sequelize';
import { GuildSettings as IGuildSettings } from '.';

const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});

// Load models
const extension = __filename.split('.').pop();
const GuildSettings: IGuildSettings = require('./models/GuildSettings' + extension)(sequelize);


/*
Reflect.defineProperty(GuildSettings.prototype, 'setSettings', {
	value: async item => {
		const userItem = await UserItems.findOne({
			where: { user_id: this.user_id, item_id: item.id },
		});

		if (userItem) {
			userItem.amount += 1;
			return userItem.save();
		}

		return GuildSettings.create({ user_id: this.user_id, item_id: item.id, amount: 1 });
	},
});

Reflect.defineProperty(GuildSettings.prototype, 'readSettings', {
	value: () => {
		return UserItems.findAll({
			where: { user_id: this.user_id },
			include: ['item'],
		});
	},
});
*/

export { GuildSettings };
