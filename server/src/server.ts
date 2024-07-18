import { Server } from "socket.io";
import express, { Application } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import { version, validate } from "uuid";

import { ACTIONS } from "./socket";
import { router } from "./routes/routes";

const ExpressConfig = (): Application => {
  const app = express();
  app.use(compression());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(helmet());
  app.use(cookieParser());
  app.use(morgan("dev"));
  app.use("/", router);

  return app;
};

const app = ExpressConfig();
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () =>
  console.log("Server Running on Port " + PORT)
);

const io = new Server(server);

const getClientRooms = () => {
  const { rooms } = io.sockets.adapter;

  return Array.from(rooms.keys()).filter(
    (roomId) => validate(roomId) && version(roomId) === 4
  );
};

const sharedRoomsInfo = () => {
  io.emit(ACTIONS.SHARE_ROOMS, { rooms: getClientRooms() });
};

io.on("connection", (socket) => {
  console.log("connection", socket.id);

  sharedRoomsInfo();

  socket.on(ACTIONS.JOIN, ({ roomId }) => {
    const { rooms: joinedRooms } = socket;

    const validRooms = Array.from(joinedRooms).filter(
      (room) => validate(room) && version(room) === 4
    );

    if (validRooms.includes(roomId)) {
      console.warn(`You already joined to with ${roomId}.`);

      return;
    }

    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

    clients.forEach((clientId) => {
      io.to(clientId).emit(ACTIONS.ADD_PEER, {
        peerId: socket.id,
        createOffer: false,
      });

      socket.emit(ACTIONS.ADD_PEER, {
        peerId: clientId,
        createOffer: true,
      });
    });

    socket.join(roomId);
    sharedRoomsInfo();
  });

  const leaveRoom = () => {
    const { rooms } = socket;

    Array.from(rooms).forEach((roomId) => {
      const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

      clients.forEach((clientId) => {
        io.to(clientId).emit(ACTIONS.REMOVE_PEER, {
          peerId: socket.id,
        });

        socket.emit(ACTIONS.REMOVE_PEER, {
          peerId: clientId,
        });
      });

      socket.leave(roomId);
    });

    sharedRoomsInfo();
  };

  socket.on(ACTIONS.LEAVE, leaveRoom);
  socket.on("disconnect", leaveRoom);

  socket.on(ACTIONS.RELAY_SDP, ({ peerId, sessionDescription }) => {
    io.to(peerId).emit(ACTIONS.SESSION_DESCRIPTION, {
      peerId: socket.id,
      sessionDescription,
    });
  });

  socket.on(ACTIONS.RELAY_ICE, ({ peerId, iceCandidate }) => {
    io.to(peerId).emit(ACTIONS.ICE_CANDIDATE, {
      peerId: socket.id,
      iceCandidate,
    });
  });
});
