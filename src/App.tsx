import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { IoMicOffOutline, IoMicOutline, IoVideocamOutline, IoVideocamOffOutline } from "react-icons/io5";
import { WebRTCConnection } from './utils/WebRTCConnection';

const socket = io('http://localhost:3001');
socket.emit('join-room', 'room1');

export const App: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remotesVideoRef = useRef<{ [userId: string]: HTMLVideoElement }>({});
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const connection = new WebRTCConnection(localVideoRef, remotesVideoRef, socket);
  }, [])

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
    Object.values(remotesVideoRef.current).forEach(video => {
      if (video) {
        video.volume = newVolume
      }
    });
  };

  return (
    <div className="container mx-auto ">
      <h1 className="text-white my-4">WebRTC Video Chat</h1>

      <div className="flex flex-wrap gap-3 mt-3" id="video">
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
