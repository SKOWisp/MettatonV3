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
import { TextBasedChannel, Message } from 'discord.js';
import { promisify } from 'util';
import 'dotenv/config';
import { MettatonStream, SongData, safeSong } from '.';
import { createPlayMessage } from '..';

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
					this.voiceConnection.destroy();
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

				const pMessage = await createPlayMessage(newResource.metadata);
				this.playMessage = await this.textChannel.send(pMessage).catch(console.warn);
			}
		});

		// Handles audio player error
		this.audioPlayer.on('error', error => {
			// Log that there were problems streaming the song
			const info = (error.resource as AudioResource<SongData>);
			console.error(`Error while streaming "${info.metadata.name}": \n${error.message}`);
			this.textChannel.send(`Error while streaming ${info.metadata.name}`).catch(console.warn);

			this.processQueue();
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

		this.processQueue();
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

	// Creates the next audioResource
	private async processQueue(): Promise<void> {
		// Return if queue is locked, empty or audio playing.
		if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || !this.queue || this.queue.length === 0) {
			return;
		}

		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue.
		let nextSong: SongData | null = this.queue.shift()!;

		// If song doesn't have an id (e.g. the song was retrieved from spotify), look it up
		if (!nextSong.urlYT) {
			nextSong = await safeSong(nextSong.name);

			// If this fails, try next song
			if (!nextSong || !nextSong.urlYT) {
				console.error(`Couldn't find' "${nextSong!.name}"`);
				this.queueLock = false;
				return this.processQueue();
			}
		}

		await MettatonStream.YouTube(nextSong.urlYT!)
			.then(mttstream => {
				// eslint-disable-next-line no-undef
				mttstream.stream.on('error', (error: NodeJS.ErrnoException) => {
					if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
					this.textChannel.send(`Error while streaming "${nextSong!.name}": \n${error}`).catch(console.warn);
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
				this.textChannel.send(`Error while creating audio resource from "${nextSong!.name}": \n${error}`).catch(console.warn);

				this.queueLock = false;
				this.processQueue();
			});


	}
}
