import { useRef, useEffect, useCallback } from "react";
import { ACTIONS, socket } from "socket";
import { useStateWithCallback } from "hooks/useStateWithCallback";

interface WebRTCProps {
  roomId?: string;
}

interface AddNewClientParams {
  newClient: string;
  cb: () => void;
}

interface ProvideMediaRefParams {
  clientId: string;
  element: HTMLVideoElement;
}

interface CreatePeerParams {
  peerId: string;
  createOffer: boolean;
}

interface SetRemoteMediaParams {
  peerId: string;
  sessionDescription: RTCSessionDescriptionInit;
}

interface HandleIceCandidate {
  peerId: string;
  iceCandidate: RTCIceCandidateInit;
}

const LOCAL_VIDEO = "LOCAL_VIDEO";

export const useWebRTC = ({ roomId }: WebRTCProps) => {
  const [clients, updateClients] = useStateWithCallback<string[]>([]);

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const localMediaStream = useRef<MediaStream | null>(null);
  const peerMediaElements = useRef<Record<string, HTMLVideoElement | null>>({
    [LOCAL_VIDEO]: null,
  });

  const addNewClient = useCallback(
    ({ newClient, cb }: AddNewClientParams) => {
      if (!clients.includes(newClient)) {
        updateClients((prev) => [...prev, newClient], cb);
      }
    },
    [clients, updateClients]
  );

  const provideMediaRef = useCallback(
    ({ clientId, element }: ProvideMediaRefParams) => {
      peerMediaElements.current[clientId] = element;
    },
    []
  );

  const startCapture = useCallback(async () => {
    localMediaStream.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    addNewClient({
      newClient: LOCAL_VIDEO,
      cb: () => {
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];

        if (localVideoElement) {
          localVideoElement.volume = 0;
          localVideoElement.srcObject = localMediaStream.current;
        }
      },
    });
  }, [addNewClient]);

  const handleNewPeer = useCallback(
    async ({ peerId, createOffer }: CreatePeerParams) => {
      if (peerId in peerConnections.current) {
        return console.warn("Already connected to peer " + peerId);
      }

      console.log("Creating peer connection", { peerId, createOffer });

      peerConnections.current[peerId] = new RTCPeerConnection({});

      peerConnections.current[peerId].onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate", event.candidate);

          socket.emit(ACTIONS.RELAY_ICE, {
            peerId,
            iceCandidate: event.candidate,
          });
        }
      };

      let tracksNumber = 0;
      peerConnections.current[peerId].ontrack = ({
        streams: [remoteStream],
      }) => {
        console.log("ontrack event received", remoteStream);
        tracksNumber++;

        if (tracksNumber === 2) {
          // Когда оба трека (видео и аудио) получены
          tracksNumber = 0;

          addNewClient({
            newClient: peerId,
            cb: () => {
              console.log("Adding new client", peerId);
              peerMediaElements.current[peerId]!.srcObject = remoteStream;
            },
          });
        }
      };

      localMediaStream.current?.getTracks().forEach((track) => {
        console.log("Adding local track", track);
        peerConnections.current[peerId].addTrack(
          track,
          localMediaStream.current!
        );
      });

      if (createOffer) {
        try {
          const offer = await peerConnections.current[peerId].createOffer();
          console.log("Creating offer", offer);

          await peerConnections.current[peerId].setLocalDescription(offer);

          socket.emit(ACTIONS.RELAY_SDP, { peerId, sessionDescription: offer });
        } catch (error) {
          console.error("Error creating offer", error);
        }
      }
    },
    [addNewClient]
  );

  const handleRemovePeer = useCallback(
    (peerId: string) => {
      if (peerConnections.current[peerId]) {
        peerConnections.current[peerId].close();
      }

      delete peerConnections.current[peerId];
      delete peerMediaElements.current[peerId];

      updateClients((clients) => clients.filter((id) => id !== peerId));
    },
    [updateClients]
  );

  const setRemoteMedia = async ({
    peerId,
    sessionDescription: remoteDescription,
  }: SetRemoteMediaParams) => {
    try {
      if (!peerConnections.current[peerId]) {
        return;
      }

      console.log("Setting remote description", remoteDescription);

      await peerConnections.current[peerId].setRemoteDescription(
        new RTCSessionDescription(remoteDescription)
      );

      if (remoteDescription.type === "offer") {
        const answer = await peerConnections.current[peerId].createAnswer();
        console.log("Creating answer", answer);

        await peerConnections.current[peerId].setLocalDescription(answer);

        socket.emit(ACTIONS.RELAY_SDP, {
          peerId,
          sessionDescription: answer,
        });
      }
    } catch (error) {
      console.error("Error setting remote media", error);
    }
  };

  const handleIceCandidate = ({ peerId, iceCandidate }: HandleIceCandidate) => {
    try {
      console.log("Adding ICE candidate", iceCandidate);
      peerConnections.current[peerId].addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      );
    } catch (error) {
      console.error("Error adding ICE candidate", error);
    }
  };

  // Первый шаг: получение доступа к локальным медиа ресурсам
  useEffect(() => {
    startCapture()
      .then(() => {
        socket.emit(ACTIONS.JOIN, { roomId, peerId: socket.id });
      })
      .catch(() => {
        console.error("Failed to get access to local media.");
      });

    return () => {
      if (roomId) {
        localMediaStream.current?.getTracks().forEach((track) => track.stop());

        socket.emit(ACTIONS.LEAVE);
      }
    };
  }, [roomId]);

  // Второй шаг: создание peer connections с удаленными пирами и установка обработчиков событий сокета
  useEffect(() => {
    socket.on(ACTIONS.ADD_PEER, handleNewPeer);
    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);
    socket.on(ACTIONS.ICE_CANDIDATE, handleIceCandidate);
    socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);

    return () => {
      socket.off(ACTIONS.ADD_PEER, handleNewPeer);
      socket.off(ACTIONS.REMOVE_PEER, handleRemovePeer);
      socket.off(ACTIONS.ICE_CANDIDATE, handleIceCandidate);
      socket.off(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
    };
  }, [addNewClient, handleNewPeer, handleRemovePeer]);

  return { clients, provideMediaRef } as const;
};
