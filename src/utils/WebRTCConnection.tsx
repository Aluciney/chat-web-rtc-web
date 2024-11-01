import { log } from 'console';
import { Socket } from 'socket.io-client';

// Definição de tipos para os objetos WebRTC
type RTCIceCandidateType = RTCIceCandidateInit | undefined;
type RTCSessionDescriptionType = RTCSessionDescriptionInit | undefined;

export class WebRTCConnection {
	localVideoRef: React.RefObject<HTMLVideoElement>;
	remotesVideoRef: React.RefObject<{ [userId: string]: HTMLVideoElement }>;
	socket: Socket;
	peerConnection: { [userId: string]: RTCPeerConnection };

	constructor(
		localVideoRef: React.RefObject<HTMLVideoElement>,
		remotesVideoRef: React.RefObject<{ [userId: string]: HTMLVideoElement }>,
		socket: Socket,
	) {
		this.localVideoRef = localVideoRef;
		this.remotesVideoRef = remotesVideoRef;
		this.socket = socket;
		this.peerConnection = {};

		this.setupSocketListeners();
		this.setupLocalStream();
	}

	async setupLocalStream() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
			if (this.localVideoRef.current) {
				this.localVideoRef.current.srcObject = stream;
			}
			this.socket.on('existing-users', (users: { id: string; }[]) => {
				users.forEach(user => this.addPeerConnection(user.id, stream));
			});
			this.socket.on('user-connected', (user: { id: string; }) => {
				this.addPeerConnection(user.id, stream);
			});
			this.socket.emit('users');
		} catch (error) {
			console.error("Erro ao acessar a mídia:", error);
		}
	}

	addPeerConnection(userId: string, stream: MediaStream) {
		if (!this.peerConnection[userId]) {
			const config: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
			this.peerConnection[userId] = new RTCPeerConnection(config);

			this.peerConnection[userId].onicecandidate = (event: RTCPeerConnectionIceEvent) => {
				if (event.candidate) {
					this.socket.emit('candidate', { userId: userId, candidate: event.candidate });
				}
			};

			this.peerConnection[userId].ontrack = (event: RTCTrackEvent) => {
				if (this.remotesVideoRef.current) {
					let videoElement = this.remotesVideoRef.current![userId];
					if (!videoElement) {
						videoElement = document.createElement('video');
						videoElement.autoplay = true;
						videoElement.playsInline = true;
						videoElement.className = 'bg-gray-900 rounded-md w-[400px] h-[300px]';
						videoElement.id = `video-${userId}`;
						const videoContainer = document.getElementById('video');
						if (videoContainer) {
							videoContainer.appendChild(videoElement);
						}
						this.remotesVideoRef.current![userId] = videoElement;
					}
					videoElement.srcObject = event.streams[0];
				}
			};

			this.peerConnection[userId].oniceconnectionstatechange = () => {
				const connectionState = this.peerConnection[userId].iceConnectionState;
				if (connectionState === 'disconnected' || connectionState === 'closed' || connectionState === 'failed') {
					this.cleanUpConnection(userId);
				}
			};

			stream.getTracks().forEach((track: any) => {
				this.peerConnection[userId].addTrack(track, stream);
			});

			this.createOffer(userId);
		}
	}

	cleanUpConnection(userId: string) {
		if (this.peerConnection[userId]) {
			this.peerConnection[userId].close();
			delete this.peerConnection[userId];
		}
		if (this.remotesVideoRef.current![userId]) {
			this.remotesVideoRef.current![userId].remove();
		}
	}

	setupSocketListeners() {
		this.socket.on('offer', async ({ userId, offer }: { userId: string; offer: RTCSessionDescriptionType }) => {
			await this.handleReceiveOffer({ userId, offer });
		});

		this.socket.on('answer', async ({ userId, answer }: { userId: string; answer: RTCSessionDescriptionType }) => {
			await this.handleReceiveAnswer({ userId, answer });
		});

		this.socket.on('candidate', async ({ userId, candidate }: { userId: string; candidate: RTCIceCandidateType }) => {
			await this.handleReceiveIceCandidate({ userId, candidate });
		});
	}

	async handleReceiveIceCandidate({ userId, candidate }: { userId: string; candidate: RTCIceCandidateType }) {
		const peer = this.peerConnection[userId];
		if (peer) {
			await this.peerConnection[userId].addIceCandidate(new RTCIceCandidate(candidate));
		}
	}

	async createOffer(userId: string) {
		const peer = this.peerConnection[userId];
		if (peer) {
			const offer = await this.peerConnection[userId].createOffer();
			await this.peerConnection[userId].setLocalDescription(offer);
			this.socket.emit('offer', { userId, offer });
		}
	}

	async createAnswer(userId: string) {
		const peer = this.peerConnection[userId];
		if (peer) {
			const answer = await this.peerConnection[userId].createAnswer();
			await this.peerConnection[userId].setLocalDescription(answer);
			this.socket.emit('answer', { userId, answer });

		}
	}

	async handleReceiveOffer({ userId, offer }: { userId: string; offer: RTCSessionDescriptionType }) {
		const peer = this.peerConnection[userId];
		if (peer) {
			// if (peer && peer.signalingState === 'stable') {
			await this.peerConnection[userId].setRemoteDescription(new RTCSessionDescription(offer!));
			await this.createAnswer(userId);
			// }
		}
	}

	async handleReceiveAnswer({ userId, answer }: { userId: string; answer: RTCSessionDescriptionType }) {
		const peer = this.peerConnection[userId];
		if (peer) {
			if (peer && peer.signalingState === 'have-local-offer') {
				await this.peerConnection[userId].setRemoteDescription(new RTCSessionDescription(answer!));
			}
		}
	}
};