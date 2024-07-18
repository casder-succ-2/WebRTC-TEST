import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";

export const ACTIONS = {
  JOIN: "join",
  LEAVE: "leave",
  ADD_PEER: "add-peer",
  REMOVE_PEER: "remove-peer",
  RELAY_SDP: "relay-sdp",
  RELAY_ICE: "relay-ice",
  ICE_CANDIDATE: "ice-candidate",
  SHARE_ROOMS: "share-rooms",
  SESSION_DESCRIPTION: "session-description",
} as const;

export const options: Partial<ManagerOptions & SocketOptions> = {
  forceNew: true,
  reconnection: true,
  reconnectionDelay: 100,
  timeout: 10000,
  transports: ["websocket"],
};

export const socket: Socket = io("http://localhost:3001", options);
