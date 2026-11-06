import agoraPkg from 'agora-access-token';
import { env } from '../config/env.js';

const { RtcTokenBuilder, RtcRole } = agoraPkg;

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: number;
  appId: string;
  expiresIn: number;
}

export function generateAgoraToken(
  channelName: string,
  userUid: number = 0,
  role: 'publisher' | 'subscriber' = 'publisher',
  expireSeconds: number = 3600
): AgoraTokenResponse {
  // Use real credentials from .env or configured defaults
  const appId = env.AGORA_APP_ID || '6d83d24d46af492aa681a5458076e36d';
  const appCertificate = env.AGORA_APP_CERTIFICATE || '82857c99a19642c6a056cd30a6bffea7';

  const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    userUid,
    rtcRole,
    privilegeExpiredTs
  );

  return {
    token,
    channelName,
    uid: userUid,
    appId,
    expiresIn: expireSeconds,
  };
}

