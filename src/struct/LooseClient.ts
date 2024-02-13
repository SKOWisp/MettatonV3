import { Client, Collection, CommandInteraction } from 'discord.js';
import { ServerQueue, IGuildSettings } from '..';

export interface LooseClient extends Client {
    commands: Collection<string, any>,
    queues: Collection<string, ServerQueue>,
    guildSettings: Collection<string, IGuildSettings>,
}

/**
 * We are using a client with added properties, so we can't use the standard CommandInteraction.
 */
export type LooseCommandInteraction = Omit<CommandInteraction, 'client'> & { client: LooseClient }
