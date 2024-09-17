import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { IoMicOffOutline, IoMicOutline, IoVideocamOutline, IoVideocamOffOutline } from "react-icons/io5";
import { WebRTCConnection } from './utils/WebRTCConnection';
import { api } from './services/api';

export const App: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [rooms, setRooms] = useState<{ name: string; value: string; }[]>([]);
  const [roomId, setRoomId] = useState<{ name: string; value: string; }>();
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    async function getRooms() {
      try {
        const { data } = await api.get('/rooms');
        setRooms(data);
      } catch (error) {

      }
    }
    getRooms();
  }, [])

  useEffect(() => {
    if (roomId) {
      const socket = io('http://localhost:3001', { query: { room: roomId.value } });
      const connection = new WebRTCConnection(localVideoRef, remoteVideoRef, socket, roomId.value);

      return () => {
        socket.off('offer');
        socket.off('answer');
        socket.off('candidate');
        socket.disconnect();
        connection.changeRoom();
      };
    }
  }, [roomId]);

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject instanceof MediaStream) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach((track) => (track.enabled = !videoEnabled));
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localVideoRef.current?.srcObject instanceof MediaStream) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach((track) => (track.enabled = !audioEnabled));
      setAudioEnabled(!audioEnabled);
    }
  };

  const handleVolumeChange = (event: any) => {
    const newVolume = event.target.value;
    setVolume(newVolume);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = newVolume;
    }
  };

  return (
    <div className="container mx-auto ">
      <h1 className="text-white my-4">WebRTC Video Chat</h1>

      <div className="flex flex-col items-start">
        <h2 className="text-white">Salas:</h2>
        <div className="flex gap-3">
          {rooms.map(room => (
            <button
              type="button"
              key={room.value}
              onClick={() => setRoomId(room)}
              className="cursor-pointer text-white hover:bg-slate-700 disabled:opacity-60 bg-slate-600 px-3 py-2 rounded-md"
              disabled={roomId?.value === room.value}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        <div className="relative">
          <video
            ref={localVideoRef}
            className="border-red-900 bg-gray-900 border-[4px] rounded-md w-[400px] h-[300px]"
            autoPlay
            playsInline
            muted
          ></video>
          <div className="flex p-2 gap-3 absolute bottom-0 right-0">
            <button onClick={toggleVideo} className="text-white hover:text-gray-400">
              {videoEnabled ? <IoVideocamOutline className="size-6" /> : <IoVideocamOffOutline className="size-6" />}
            </button>
            <button onClick={toggleAudio} className="text-white hover:text-gray-400">
              {audioEnabled ? <IoMicOutline className="size-6" /> : <IoMicOffOutline className="size-6" />}
            </button>
          </div>
        </div>
        <video
          ref={remoteVideoRef}
          className="border-gray-900 bg-gray-900 border-[4px] rounded-md w-[400px] h-[300px]"
          autoPlay
          playsInline
        ></video>
      </div>
      <div className="flex flex-col w-52 my-3">
        <label htmlFor="volume" className="text-white">Volume: </label>
        <input
          id="volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
        />
      </div>
    </div>
  );
};
