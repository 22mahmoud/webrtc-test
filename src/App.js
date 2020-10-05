import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import io from 'socket.io-client';

function useInput(intialValue = '') {
  const ref = useRef();
  const [value, setValue] = useState(intialValue);
  const [inputError, setInputError] = useState('');

  const handleOnChange = useCallback((event) => {
    const _value = event.target.value
    setValue(_value);
    if (inputError && _value.trim().length >= 1) {
      setInputError('');
    }
  }, [inputError]);

  const handleOnBlur = useCallback(() => {
    if (value.trim().length === 0){
      setInputError('Please enter valid room name');
    } else {
      setInputError('');
    }
  }, [value]);

  const data = useMemo(() => [
    value, 
    inputError, 
    {
      onChange: handleOnChange, 
      onBlur: handleOnBlur, 
      setInputError,
      ref 
    },
  ], [inputError, value, handleOnBlur, handleOnChange]);

  return data;
}

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

function App() {
  const pc = useRef(new RTCPeerConnection(iceServer));

  const [
    room, 
    roomInputError, 
    { ref: roomInputRef, setInputError: setRoomInputError, ...handlers }
  ] = useInput('');

  const [inCall, setInCall] = useState(() => !!room);
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
  }, [room, localStream]);

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
  }, [room, localStream, ]);

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
    setRoomInputError('The room is full please choose anthor name');
  }, [setRoomInputError]);

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
    if (!inCall) return;

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
      inCall,
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
    if (roomInputRef?.current) {
      roomInputRef.current.focus();
    }
      
  }, [roomInputRef])

  function handleOnJoin(event) {
    event.preventDefault();
    if (roomInputError) return;

    setInCall(true);
    socket.emit('create_or_join', room);
  }

  return (
    <div className='max-w-3xl mx-auto p-5 w-full h-full'>
      <h1 className='text-2xl font-bold text-center my-8'> WebRTC Test </h1>
      {!inCall ? (
        <form onSubmit={handleOnJoin} className='d-flex'>
          <label className="block mb-3">
            <span className="text-gray-700">Room Name</span>
            <input 
              type="text" 
              placeholder="friends" 
              value={room}
              required
              ref={roomInputRef}
              {...handlers}
              className="form-input mt-1 block w-full" 
            />
            {roomInputError && <span className="text-red-600 mt-1">{roomInputError}</span>}
          </label>
          <button 
            type='submit' 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Join
          </button>
        </form>
        ): (
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
        )}
    </div>
  );
}

export default App;
