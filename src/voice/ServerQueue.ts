import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	createAudioResource,
	entersState,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { TextBasedChannel, Message, SendableChannels } from 'discord.js';
import { promisify } from 'util';
import { MettatonStream, SongData, safeSong } from '.';
import { MettatonMessage, VoiceSettings } from '..';

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

	private voiceSettings_: VoiceSettings;
	private queue_: SongData[];
	private currentSong_: SongData | null = null;

	// Readonly from ouside and both read and write from the inside
	get voiceSettings() {
		return this.voiceSettings_;
	}
	get queue() {
		return this.queue_ as ReadonlyArray<SongData>;
	}
	get currentSong() {
		return this.currentSong_;
	}

	private queueLock = false;
	private playMessage: Message<boolean> | null | void;

	/**
	 * Initialize a ServerQueue object that handles music playback
	 * @param {VoiceConnection} VoiceConnection yt url of the video
	 * @returns {ServerQueue}
	 * @public
	 */
	public constructor(voiceConnection: VoiceConnection, textChannel: TextBasedChannel, voiceSettings: VoiceSettings) {
		this.voiceConnection = voiceConnection;
		this.textChannel = textChannel;
		this.voiceSettings_ = voiceSettings;

		this.audioPlayer = createAudioPlayer();
		this.queue_ = [];
		this.playMessage = null;

		// Listens to voice connection state changes and acts accordingly
		this.voiceConnection.on('stateChange', async (_, newState) => {
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
						this.eraseQueue();
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
					this.eraseQueue();
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
					this.eraseQueue();
				}
			}
		});

		// Listens to audio player state changes and acts accordingly
		this.audioPlayer.on('stateChange', async (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
				// The queue is then processed to start playing the next track, if one is available.

				// Log that the previous song ended
				const oldResource = (oldState.resource as AudioResource<SongData>);
				console.log(`Song ${oldResource.metadata.name} has ended`);
				if (this.playMessage) this.playMessage.delete().catch(console.warn);
				this.currentSong_ = null;

				this.processQueue();
			}
			else if (newState.status === AudioPlayerStatus.Playing) {
				// If the Playing state has been entered, then a new track has started playback.

				// Log the that a new song has begun
				const newResource = (newState.resource as AudioResource<SongData>);
				this.currentSong_ = newResource.metadata;
				console.log(`Now playing: ${newResource.metadata.name}`);

				const pMessage = await MettatonMessage.createPlayMessage(newResource.metadata);
				this.playMessage = await (this.textChannel as SendableChannels).send(pMessage).catch(console.warn);
			}
		});

		// Handles audio player error
		this.audioPlayer.on('error', error => {
			// Log that there were problems streaming the song
			const info = (error.resource as AudioResource<SongData>);
			console.error(`Error while streaming "${info.metadata.name}": \n${error.message}`);
			(this.textChannel as SendableChannels).send(`Error while streaming ${info.metadata.name}`).catch(console.warn);

			this.processQueue();
		});

		voiceConnection.subscribe(this.audioPlayer);
	}

	/**
	 * Adds tracks to the queue, as long as it doensn't exceed the limit set in {@link VoiceSettings}.
	 * @param {SongData[]} songs Songs to enqueue
	 * @param {SongData[]} add Whether to add only the first song to the beginning of the queue.
	 * @returns {number} Number of songs enqueued
	 * @public
	 */
	public enqueue(songs: SongData[] = ([] as SongData[]), add: boolean = false): number {
		// Extra to account for current song
		const extra: number = ((this.currentSong !== null) ? 1 : 0);
		const difference = this.voiceSettings_.maxSongs - this.queue_.length - extra;

		if (difference <= 0) {
			return 0;
		}

		const songsToQueue = songs.slice(0, difference);
		const count = songsToQueue.length;

		if (add) {
			this.queue_.unshift(songsToQueue[0]);
		}
		else {
			this.queue_ = this.queue_.concat(songsToQueue);
		}

		this.processQueue();

		return count;
	}

	/**
	 * Skips songs. Please pass an int I don't want to validate the argument.
	 * @param {number} skips # of songs to skip
	 * @public
	 */
	public skip(skips: number) {
		// Slice queue if necessary
		if (skips > 1) {
			const newArray = this.queue_.slice(skips - 1);
			this.queue_ = newArray;
		}
		this.audioPlayer.stop();
	}

	/**
	 * Remove song in position. Please pass an int I don't want to validate the argument.
	 * @param {number} pos Postion of the song to remove
	 * @returns {string} Name of the song removed. If the song at play is removed, it returns a silly message.
	 * @public
	 */
	public remove(pos: number): string {
		// Stop current song if pos is 1
		// Leave channel if no songs left
		if (pos === 1 || pos <= 0) {
			this.audioPlayer.stop();

			return 'use /skip dummy...';
		}

		// Remove song in /queue return name of the removed song
		const songName = this.queue_[pos - 2].name;
		this.queue_.splice(pos - 2, 1);
		return songName;
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
			(this.textChannel as SendableChannels).send('Disconnecting...');
		}

		// Erase queue and stop audio player
		this.queue_ = [];
		this.audioPlayer.stop(true);
		this.currentSong_ = null;
	}

	/**
	 * Whether the queue has reached the limit set in {@link VoiceSettings}.
	 */
	public isFull(): boolean {
		// Extra to account for current song
		const extra: number = ((this.currentSong !== null) ? 1 : 0);
		if (extra + this.queue_.length >= this.voiceSettings_.maxSongs) {
			return true;
		}
		return false;
	}

	/**
	 * Use to update voice settings
	 * @param {VoiceSettings} settings The new settings
	 */
	public updateVoiceSettings(settings: VoiceSettings) {
		this.voiceSettings_ = settings;
	}

	// Creates the next audioResource
	private async processQueue(): Promise<void> {
		// Return if queue is locked, empty or audio playing.
		if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || !this.queue_ || this.queue_.length === 0) {
			return;
		}

		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue.
		let nextSong: SongData = this.queue_.shift()!;

		// If song doesn't have an id (e.g. the song was retrieved from spotify), look it up
		if (!nextSong.urlYT) {
			const video = await safeSong(nextSong.name);

			// If this fails, try next song
			if (typeof video === 'string') {
				console.error(`Couldn't find' "${nextSong!.name}"`);
				this.queueLock = false;
				return this.processQueue();
			}

			nextSong = video;
		}

		await MettatonStream.YouTube(nextSong.urlYT!)
			.then(mttstream => {
				// eslint-disable-next-line no-undef
				mttstream.stream.on('error', (error: NodeJS.ErrnoException) => {
					if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
					(this.textChannel as SendableChannels).send(`Error while streaming "${nextSong!.name}": \n${error}`).catch(console.warn);
					throw error;
				});

				nextSong = mttstream.songdata;
				const audioResource = createAudioResource(mttstream.stream, {
					inputType: mttstream.type,
					metadata: nextSong,
				});
				this.audioPlayer.play(audioResource);
				this.queueLock = false;
			})
			.catch(error => {
				console.error(`Error while creating audio resource from "${nextSong!.name}": \n${error}`);
				(this.textChannel as SendableChannels).send(`Error while creating audio resource from "${nextSong!.name}": \n${error}`).catch(console.warn);

				this.queueLock = false;
				this.processQueue();
			});


	}
}
