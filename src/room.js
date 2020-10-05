import React, { useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

const streamConstraints =  {
  video: true,
  audio: true
};

const iceServer =  {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.voipbuster.com:3478' },
  ],
};

const socket = io(process.env.NODE_ENV === 'development' ? 
  'http://localhost:5000' : 
  'https://webrtc-22mahmoud.herokuapp.com/');


const Room = () => {
  const { id: room } = useParams();
  const pc = useRef(new RTCPeerConnection(iceServer));
  const isCaller = useRef(false);
  const localStream = useRef();
  const localVideo = useRef();
  const remoteVideo = useRef();

  const onCreated = useCallback(async () => {
    const stream = await navigator
      .mediaDevices
      .getUserMedia(streamConstraints);

    isCaller.current = true;
    localStream.current = stream;
    localVideo.current.srcObject = stream;
  }, []);

  const onJoined = useCallback(async () => {
    const stream = await navigator
      .mediaDevices
      .getUserMedia(streamConstraints);

    isCaller.current = false;
    localStream.current = stream;
    localVideo.current.srcObject = stream;

    socket.emit('ready', room);
  }, [room]);

  const onReady = useCallback(async () => {
    if (!isCaller.current) return;

    localStream.current.getTracks().forEach(track => {
      pc.current.addTrack(track, localStream.current);
    });

    const offer = await pc.current.createOffer();
    pc.current.setLocalDescription(offer);

    socket.emit('offer', {
      type: 'offer',
      sdp: offer,
      room,
    });
  }, [room]);

  const onOffer = useCallback(async (event) => {
    if (isCaller.current) return;

    localStream.current.getTracks().forEach(track => {
      pc.current.addTrack(track, localStream.current);
    });

    pc.current.setRemoteDescription(new RTCSessionDescription(event));
    const answer = await pc.current.createAnswer();
    pc.current.setLocalDescription(answer);

    socket.emit('answer', {
      type: 'answer',
      sdp: answer,
      room
    });
  }, [room]);

  const onAnswer = useCallback((event) => {
    pc.current.setRemoteDescription(new RTCSessionDescription(event));
  }, []);

  const onCandidate = useCallback((event) => {
    const candidate = new RTCIceCandidate({
      sdpMLineIndex: event.label,
      candidate: event.candidate,
    });

    pc.current.addIceCandidate(candidate);
  }, []);

  const onFull = useCallback(() => {
    //
  }, []);

  const onIceCandidate = useCallback(({ candidate }) => {
    if (!candidate) return;

    socket.emit('candidate', {
      type: 'candidate',
      label: candidate.sdpMLineIndex,
      candidate: candidate.candidate,
      room,
    });
  }, [room]);

  const onAddStream = useCallback(({ streams: [stream] }) => {
    remoteVideo.current.srcObject = stream;
  }, []);

  useEffect(() => { 
    socket.on('created', onCreated);
    socket.on('joined', onJoined);
    socket.on('ready', onReady);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('candidate', onCandidate);
    socket.on('full', onFull);

    pc.current.onicecandidate = onIceCandidate;
    pc.current.ontrack = onAddStream;

    return () => {
      socket.off();
    }
  }, [
      onCandidate, 
      onCreated, 
      onJoined, 
      onReady, 
      onOffer, 
      onAnswer, 
      onIceCandidate, 
      onAddStream,
      onFull
  ]);

  useEffect(() => {
    socket.emit('create_or_join', room);
  }, [room]);

  return (
    <div className='relative'>
      <video 
        className='absolute bg-black w-full inset-0'
        autoPlay
        ref={remoteVideo}
      ></video>
      <video 
        className='absolute bg-black w-1/3 top-0 left-0 m-4 border-solid border-2 border-gray-600'
        muted 
        ref={localVideo}
        autoPlay
      ></video>
    </div>
  );
}

export default Room;
