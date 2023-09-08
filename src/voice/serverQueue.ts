import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	entersState,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { TextBasedChannel, Message } from 'discord.js';
import { promisify } from 'util';
import 'dotenv/config';
import { audioResourceYT } from './audioResourceYT';
import { SongData } from './SongData';
import { safeSong } from './safeSong';
import { CreatePlayEmbed } from '../utils/embeds';


const wait = promisify(setTimeout);

/**
 * Per-server object that saves track list and voice connection to server.
 */
export class ServerQueue {
	public readonly voiceConnection: VoiceConnection;
	public readonly textChannel: TextBasedChannel;
	public readonly audioPlayer: AudioPlayer;
	// eslint-disable-next-line no-undef
	public timeoutID: NodeJS.Timeout | null = null;

	public queue: SongData[];
	private currentSong_: SongData | null = null;

	// Readonly from ouside and both read and write from the inside
	get currentSong() {
		return this.currentSong_;
	}

	private queueLock = false;
	private playMessage: Message<boolean> | null | void;

	public constructor(voiceConnection: VoiceConnection, textChannel: TextBasedChannel) {
		this.voiceConnection = voiceConnection;
		this.textChannel = textChannel;
		this.audioPlayer = createAudioPlayer();
		this.queue = [];
		this.playMessage = null;

		// Listens to voice connection state changes and acts accordingly
		this.voiceConnection.on('stateChange', async (_, newState) => {
			// consolFe.log(`Connection transitioned from ${_.status} to ${newState.status}`);
			// Manages reconnection after a disconnect
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
					/*
						If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
						but there is a chance the connection will recover itself if the reason of the disconnect was due to
						switching voice channels. This is also the same code for the bot being kicked from the voice channel,
						so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
						the voice connection.
					*/
					try {
						await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
						// Probably moved voice channel
					}
					catch {
						this.voiceConnection.destroy();
						// Probably removed from voice channel
					}
				}
				else if (this.voiceConnection.rejoinAttempts < 5) {
					/*
						The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
					*/
					await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
					this.voiceConnection.rejoin();
				}
				else {
					/*
						The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
					*/
					this.voiceConnection.destroy();
				}
				return;
			}

			// Manages Signalling and Connecting states
			if (newState.status !== VoiceConnectionStatus.Ready && newState.status !== VoiceConnectionStatus.Connecting) {
				/*
					In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
					before destroying the voice connection. This stops the voice connection permanently existing in one of these
					states.
				*/

				try {
					await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
				}
				catch {
					// Destroys voice connection if stuck in the Signalling or Connecting states
					if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
				}
			}
		});

		// Listens to audio player state changes and acts accordingly
		this.audioPlayer.on('stateChange', async (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
				// The queue is then processed to start playing the next track, if one is available.

				// Log that the previous son ended
				const oldResource = (oldState.resource as AudioResource<SongData>);
				console.log(`Song ${oldResource.metadata.title} has ended`);
				if (this.playMessage) this.playMessage.delete().catch(console.warn);
				this.currentSong_ = null;

				// Process queue if there are songs left
				if (this.queue) {
					void this.processQueue();
				}
			}
			else if (newState.status === AudioPlayerStatus.Playing) {
				// If the Playing state has been entered, then a new track has started playback.
				// Metadata can't be undefined because it was obtained on song load.

				// Log the that a new song has begun
				const newResource = (newState.resource as AudioResource<SongData>);
				this.currentSong_ = newResource.metadata;
				console.log(`Now playing: ${newResource.metadata.title}`);

				const embed = await CreatePlayEmbed(newResource.metadata);
				this.playMessage = await this.textChannel.send({ content: 'Now playing: ', embeds: [embed] }).catch(console.warn);
			}
		});

		// Handles audio player error
		this.audioPlayer.on('error', error => {
			// Log that there were problems streaming the song
			const info = (error.resource as AudioResource<SongData>);
			console.warn(`Error while streaming "${info.metadata.title}"": ${error.message}`);
			textChannel.send(`Error while streaming ${info.metadata.title}`).catch(console.warn);
		});

		voiceConnection.subscribe(this.audioPlayer);
	}

	// Adds tracks to the queue, as long as it doensn't exceed the limit
	public enqueue(songs: SongData[] = ([] as SongData[])) {
		const difference = Number(process.env.MAX_SONGS) - this.queue.length;
		if (difference < 0) {
			return;
		}
		const newArray = this.queue.concat(songs.slice(0, difference));
		this.queue = newArray;
		void this.processQueue();
	}

	/**
	 * Disconnects bot from voice channel gracefully
	 * Remember to delete the serverQueue object from the client afterwards
	 * @param sendMessage Wheter to send a farewell message or not
	 */
	public eraseQueue(sendMessage: boolean = false) {
		console.log('Erasing queue');
		// Destroy voice connection
		if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
			this.voiceConnection.destroy();
		}

		// Send bye message
		if (sendMessage) {
			this.textChannel.send('Disconnecting...');
		}

		// Erase queue and stop audio player
		this.queue = [];
		this.audioPlayer.stop(true);
		this.currentSong_ = null;
	}

	// Sets up a Track object for the next item in the queue
	private async processQueue(): Promise<void> {
		// Return if queue is locked, empty or audio playing.
		if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
			return;
		}

		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue.
		let nextSong: SongData | null = this.queue.shift()!;

		// If song doesn't have an id (retrieved from spotify), look it up
		if (!nextSong.id) {
			nextSong = await safeSong(nextSong.title);

			// If this fails, try next song
			if (!nextSong) {
				this.queueLock = false;
				return this.processQueue();
			}
		}

		try {
			// Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
			const resource = await audioResourceYT(nextSong);
			this.audioPlayer.play(resource);
			this.queueLock = false;
		}
		catch (error) {
			console.log(error);
			this.queueLock = false;
			return this.processQueue();
		}
	}
}
