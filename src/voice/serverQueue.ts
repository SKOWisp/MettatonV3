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
import { TextBasedChannel } from 'discord.js';
import { promisify } from 'util';
import { safeSong } from './safeSong';
import 'dotenv/config';
import { audioResourceYT } from './audioResourceYT';
import { SongData } from './SongData';
import { Track } from './Track';

const wait = promisify(setTimeout);

/**
 * Per-server object that saves track list and voice connection to server.
 */
export class ServerQueue {
	public readonly voiceConnection: VoiceConnection;
	public readonly textChannel: TextBasedChannel;
	public readonly audioPlayer: AudioPlayer;
	public readonly timeoutID: any = null;
	public readonly onCountDown: any = false;

	public queue: Track[];
	public currentSong: SongData | undefined;

	public prevMembers = null;
	public queueLock = false;

	public constructor(voiceConnection: VoiceConnection, textChannel: TextBasedChannel) {
		this.voiceConnection = voiceConnection;
		this.textChannel = textChannel;
		this.audioPlayer = createAudioPlayer();
		this.queue = [];

		// Listens to voice connection state changes and acts accordingly
		this.voiceConnection.on('stateChange', async (_, newState) => {
			// console.log(`Connection transitioned from ${_.status} to ${newState.status}`);

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

			// Manages destruction of the voice connection
			if (newState.status === VoiceConnectionStatus.Destroyed) {
				this.eraseQueue();
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
		this.audioPlayer.on('stateChange', (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
				// The queue is then processed to start playing the next track, if one is available.

				const oldRes = (oldState.resource as AudioResource<Track>);
				if (oldRes.metadata) {
					oldRes.metadata.onFinish(this.currentSong!);
				}
				// Process queue if there are songs left
				if (this.queue) {
					void this.processQueue();
				}
			}
			else if (newState.status === AudioPlayerStatus.Playing) {
				// If the Playing state has been entered, then a new track has started playback.
				// Metadata can't be undefined because it was obtained on song load.
				console.log(`Now playing: ${this.currentSong!.title}`);
				(newState.resource as AudioResource<Track>).metadata.onStart(this.currentSong!);
			}
		});

		// Handles audio player error
		this.audioPlayer.on('error', error => {
			const info = (error.resource as AudioResource<Track>);
			console.warn(`Error while streaming "${info.metadata.title}"": ${error.message}`);
			textChannel.send(`Error while streaming ${info.metadata.title}`).catch(console.warn);
		});

		voiceConnection.subscribe(this.audioPlayer);
	}

	// Adds tracks to the queue, as long as it doensn't exceed the limit
	public enqueue(tracks: Track[]) {
		const difference = Number(process.env.MAX_SONGS) - this.queue.length;
		if (difference < 0) {
			return;
		}
		const newArray = this.queue.concat(tracks.slice(0, difference));
		this.queue = newArray;
		void this.processQueue();
	}

	// Stops audio player and destroys connection if necessary.
	public eraseQueue() {
		console.log('Erasing queue');
		if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
			this.voiceConnection.destroy();
		}
		this.audioPlayer.stop(true);
		this.queue = [];
	}

	private async processQueue(): Promise<void> {
		// Return if queue is locked, empty or audio playing.
		if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
			return;
		}

		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
		const nextTrack = this.queue.shift()!;

		const info = await safeSong(nextTrack.title);
		// If getting info fails, try next song
		if (info === null) {
			console.log(`ytsr no pudo encontrar ${nextTrack.title}`);
			this.queueLock = false;
			return this.processQueue();
		}

		this.currentSong = info!;
		nextTrack.url = info!.url;
		nextTrack.title = info!.title;

		try {
			// Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
			const resource = await audioResourceYT(nextTrack);
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
