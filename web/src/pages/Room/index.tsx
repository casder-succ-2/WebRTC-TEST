import { useParams } from "react-router";

import { useWebRTC } from "hooks";

export const Room = () => {
  const params = useParams();
  const { id: roomId } = params;

  const { clients, provideMediaRef } = useWebRTC({ roomId });

  console.log("clients", clients);

  return (
    <div>
      <h2>Room</h2>

      <div>
        {clients.map((clientId) => (
          <div key={clientId}>
            <video
              ref={(el) => {
                provideMediaRef({
                  clientId,
                  element: el!,
                });
              }}
              autoPlay
              playsInline
              muted={clientId === "LOCAL_VIDEO"}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
