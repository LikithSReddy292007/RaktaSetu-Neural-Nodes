import { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { Camera, CameraOff, Copy, Check, Mic, MicOff, PhoneOff, ShieldCheck, Users, Video, X } from 'lucide-react';
import { api } from '@/lib/api';

interface VideoCallModalProps {
  channelName: string;
  recipientName: string;
  onClose: () => void;
}

export function VideoCallModal({ channelName, recipientName, onClose }: VideoCallModalProps) {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudio, setLocalAudio] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideo, setLocalVideo] = useState<ICameraVideoTrack | null>(null);

  const [callStatus, setCallStatus] = useState<'initializing' | 'connecting' | 'connected' | 'error' | 'ended'>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [copied, setCopied] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Normalize channel name so both users always join the exact same Agora channel
  const normalizedChannel = channelName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  useEffect(() => {
    let agoraClient: IAgoraRTCClient | null = null;
    let audioTrack: IMicrophoneAudioTrack | null = null;
    let videoTrack: ICameraVideoTrack | null = null;

    async function initCall() {
      try {
        setCallStatus('connecting');

        // 1. Fetch Agora token from backend API
        const tokenRes = await api.getAgoraToken(normalizedChannel, 'publisher', 0);
        const { token, appId, uid } = tokenRes.data;

        // 2. Create Agora RTC Client
        agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setClient(agoraClient);

        // Remote user joined/left listeners
        agoraClient.on('user-joined', () => {
          setRemoteUserJoined(true);
        });

        agoraClient.on('user-left', () => {
          setRemoteUserJoined(false);
          setRemoteHasVideo(false);
        });

        // Remote media published listener
        agoraClient.on('user-published', async (user, mediaType) => {
          setRemoteUserJoined(true);
          await agoraClient!.subscribe(user, mediaType);

          if (mediaType === 'video' && remoteVideoRef.current) {
            setRemoteHasVideo(true);
            user.videoTrack?.play(remoteVideoRef.current);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });

        agoraClient.on('user-unpublished', (_user, mediaType) => {
          if (mediaType === 'video') {
            setRemoteHasVideo(false);
          }
        });

        // 3. Acquire mic and camera tracks
        try {
          [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          setLocalAudio(audioTrack);
          setLocalVideo(videoTrack);

          if (localVideoRef.current && videoTrack) {
            videoTrack.play(localVideoRef.current);
          }
        } catch (mediaError: any) {
          console.warn('Microphone/Camera permission warning:', mediaError.message);
          // Graceful fallback to audio-only if camera blocked
          try {
            audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            setLocalAudio(audioTrack);
          } catch (audioErr: any) {
            console.warn('Microphone permission blocked:', audioErr.message);
          }
        }

        // 4. Join Agora Channel
        await agoraClient.join(appId, normalizedChannel, token, uid || null);

        // 5. Publish local media tracks
        const tracksToPublish = [audioTrack, videoTrack].filter(Boolean) as any[];
        if (tracksToPublish.length > 0) {
          await agoraClient.publish(tracksToPublish);
        }

        setCallStatus('connected');
      } catch (err: any) {
        console.error('Call initialization failed:', err);
        setCallStatus('error');
        setErrorMessage(
          err.message || 'Could not connect to the voice/video call. Please verify network and camera/mic permissions.'
        );
      }
    }

    void initCall();

    return () => {
      // Cleanup all media tracks on unmount
      if (audioTrack) {
        audioTrack.stop();
        audioTrack.close();
      }
      if (videoTrack) {
        videoTrack.stop();
        videoTrack.close();
      }
      if (agoraClient) {
        void agoraClient.leave();
      }
    };
  }, [normalizedChannel]);

  const toggleMic = () => {
    if (localAudio) {
      localAudio.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideo) {
      localVideo.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const copyRoomInfo = () => {
    navigator.clipboard.writeText(normalizedChannel);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const endCall = async () => {
    setCallStatus('ended');
    if (localAudio) {
      localAudio.stop();
      localAudio.close();
    }
    if (localVideo) {
      localVideo.stop();
      localVideo.close();
    }
    if (client) {
      await client.leave();
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && endCall()}>
      <div
        className="modal"
        style={{
          maxWidth: '640px',
          width: '95%',
          background: '#181413',
          color: '#fff',
          borderRadius: '8px',
          padding: '22px',
          border: '1px solid #3d312a',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: remoteUserJoined ? '#4caf50' : '#ff9800',
                  boxShadow: remoteUserJoined ? '0 0 10px #4caf50' : 'none',
                }}
              />
              <strong style={{ fontSize: '16px' }}>
                {remoteUserJoined ? `In Call with ${recipientName}` : `Calling ${recipientName}…`}
              </strong>
            </div>
            <small style={{ color: '#a79b90', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <ShieldCheck size={13} color="#4caf50" />
              <span>Agora RTC Channel: <b>{normalizedChannel}</b></span>
              <button
                type="button"
                onClick={copyRoomInfo}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: '#d29c44',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Room'}
              </button>
            </small>
          </div>
          <button
            onClick={endCall}
            aria-label="Close"
            style={{ background: 'transparent', border: 0, color: '#a79b90', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Screen Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '320px',
            background: '#0d0a09',
            borderRadius: '6px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Remote Video Container */}
          <div
            ref={remoteVideoRef}
            style={{
              width: '100%',
              height: '100%',
              display: remoteHasVideo ? 'block' : 'none',
            }}
          />

          {/* Placeholder when remote has no video or waiting */}
          {(!remoteHasVideo || !remoteUserJoined) && (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a79b90',
                fontSize: '13px',
                textAlign: 'center',
                padding: '20px',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: '#2b231f',
                  border: '2px solid #55443a',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: '#d29c44',
                  marginBottom: '12px',
                }}
              >
                {recipientName.slice(0, 2).toUpperCase()}
              </div>

              {remoteUserJoined ? (
                <>
                  <strong style={{ fontSize: '15px', color: '#fff', marginBottom: '4px' }}>
                    {recipientName} connected
                  </strong>
                  <span style={{ fontSize: '12px', color: '#66bb6a' }}>● Voice audio channel active</span>
                </>
              ) : (
                <>
                  <strong style={{ fontSize: '15px', color: '#fff', marginBottom: '4px' }}>
                    Waiting for {recipientName} to join…
                  </strong>
                  <span style={{ fontSize: '11px', color: '#887d74', maxWidth: '300px' }}>
                    Ask your friend to tap "Call" on their phone to connect to channel <b>{normalizedChannel}</b>.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Local Video Picture-in-Picture */}
          <div
            ref={localVideoRef}
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              width: '110px',
              height: '82px',
              background: '#261f1b',
              borderRadius: '4px',
              border: '2px solid rgba(255,255,255,0.25)',
              overflow: 'hidden',
              display: isVideoOff ? 'none' : 'block',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          />

          {callStatus === 'connecting' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(13,10,9,0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              <div className="pulse-dot" style={{ background: '#d29c44', marginBottom: '8px' }} />
              <span>Connecting to Agora RTC Voice & Video…</span>
            </div>
          )}

          {callStatus === 'error' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(13,10,9,0.92)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                color: '#f8a8a2',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 12px', fontSize: '13px' }}>{errorMessage}</p>
              <button className="button button-light" onClick={endCall}>
                Close
              </button>
            </div>
          )}
        </div>

        {/* Media Controls Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '14px',
            marginTop: '16px',
          }}
        >
          {/* Mute Mic */}
          <button
            onClick={toggleMic}
            aria-label="Toggle Microphone"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              border: '1px solid #4d3e35',
              background: isMuted ? '#b13026' : '#2b231f',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            {isMuted ? <MicOff size={19} /> : <Mic size={19} />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={toggleVideo}
            aria-label="Toggle Camera"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              border: '1px solid #4d3e35',
              background: isVideoOff ? '#b13026' : '#2b231f',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            {isVideoOff ? <CameraOff size={19} /> : <Camera size={19} />}
          </button>

          {/* End Call */}
          <button
            onClick={endCall}
            aria-label="End Call"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              border: 0,
              background: '#b13026',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(177, 48, 38, 0.4)',
            }}
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
