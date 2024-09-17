import { Socket } from 'socket.io-client';

// Definição de tipos para os objetos WebRTC
type RTCIceCandidateType = RTCIceCandidateInit | undefined;
type RTCSessionDescriptionType = RTCSessionDescriptionInit | undefined;

export class WebRTCConnection {
	localVideoRef: React.RefObject<HTMLVideoElement>;
	remoteVideoRef: React.RefObject<HTMLVideoElement>;
	socket: Socket;
	peerConnection: RTCPeerConnection | null;
	roomId: string;

	constructor(
		localVideoRef: React.RefObject<HTMLVideoElement>,
		remoteVideoRef: React.RefObject<HTMLVideoElement>,
		socket: Socket,
		roomId: string,
	) {
		this.localVideoRef = localVideoRef;
		this.remoteVideoRef = remoteVideoRef;
		this.socket = socket;
		this.peerConnection = null;
		this.roomId = roomId;

		this.setupSocketListeners();
		this.setupLocalStream();
	}

	async setupLocalStream() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
			if (this.localVideoRef.current) {
				this.localVideoRef.current.srcObject = stream;
			}
			const config: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
			this.peerConnection = new RTCPeerConnection(config);
			this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
				if (event.candidate) {
					this.socket.emit('candidate', { room: this.roomId, candidate: event.candidate });
				}
			};

			this.peerConnection.ontrack = (event: RTCTrackEvent) => {
				if (this.remoteVideoRef.current) {
					this.remoteVideoRef.current.srcObject = event.streams[0];
				}
			};

			// Adicionar detecção de estado de conexão
			this.peerConnection.oniceconnectionstatechange = () => {
				const connectionState = this.peerConnection?.iceConnectionState;
				if (connectionState === 'disconnected') {
					console.log('disconnected');
					
					if (this.remoteVideoRef.current) {
						this.remoteVideoRef.current.srcObject = null;
					}
				} else if (connectionState === 'failed') {
					console.log('failed');
				} else if (connectionState === 'closed') {
					console.log('closed');
				}
			};

			stream.getTracks().forEach((track: any) => {
				this.peerConnection?.addTrack(track, stream);
			});

			this.createOffer();
		} catch (error) {
			console.error("Erro ao acessar a mídia:", error);
		}
	}

	setupSocketListeners() {
		this.socket.on('offer', async (offer: RTCSessionDescriptionType) => {
			await this.handleReceiveOffer(offer);
		});

		this.socket.on('answer', async (answer: RTCSessionDescriptionType) => {
			await this.handleReceiveAnswer(answer);
		});

		this.socket.on('candidate', async (candidate: RTCIceCandidateType) => {
			await this.handleReceiveIceCandidate(candidate);
		});
	}

	// Adicionar candidatos ICE apenas se a remoteDescription já estiver configurada
	async handleReceiveIceCandidate(candidate: RTCIceCandidateType) {
		if (this.peerConnection) {
			try {
				await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
			} catch (error) {
				console.error('Erro ao adicionar ICE candidate:', error);
			}
		}
	}

	async createOffer() {
		if (this.peerConnection) {
			const offer = await this.peerConnection.createOffer();
			await this.peerConnection.setLocalDescription(offer);
			this.socket.emit('offer', { room: this.roomId, offer });
		}
	}

	async createAnswer() {
		if (this.peerConnection) {
			const answer = await this.peerConnection.createAnswer();
			await this.peerConnection.setLocalDescription(answer);
			this.socket.emit('answer', { room: this.roomId, answer });
		}
	}

	async handleReceiveOffer(offer: RTCSessionDescriptionType) {
		if (this.peerConnection) {
			await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer!));
			this.createAnswer();
		}
	}

	async handleReceiveAnswer(answer: RTCSessionDescriptionType) {
		if (this.peerConnection) {
			await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer!));
		}
	}

	async changeRoom() {
		if (this.remoteVideoRef.current) {
			this.remoteVideoRef.current.srcObject = null;
		}
		if (this.peerConnection) {
			this.peerConnection.getSenders().forEach(sender => this.peerConnection?.removeTrack(sender));
			this.peerConnection.close();
			this.peerConnection = null;
		}
	}
}