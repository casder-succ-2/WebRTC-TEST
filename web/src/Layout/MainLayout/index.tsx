import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { v4 } from "uuid";

import { ACTIONS, socket } from "socket";

export const MainLayout = () => {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    socket.on(ACTIONS.SHARE_ROOMS, ({ rooms }) => {
      setRooms(rooms);
    });
  }, []);

  const createRoom = () => {
    const id = v4();
    navigate(`/room/${id}`);
  };

  const joinRoom = (id: string) => {
    socket.emit(ACTIONS.JOIN, { roomId: id });

    navigate(`/room/${id}`);
  };

  useEffect(() => {
    socket.on("BROO", ({ message }) => {
      console.log("message", message);
    });
  }, []);

  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link to="/nothing-here">Nothing Here</Link>
          </li>
        </ul>
      </nav>

      <hr />

      <Outlet />

      <div style={{ paddingTop: 20 }}>
        <h2>Rooms</h2>

        <ul>
          {rooms.map((roomId: string) => {
            return (
              <li key={roomId} style={{ marginBottom: 10 }}>
                <Link to={`/room/${roomId}`}>{roomId}</Link>

                <br />

                <button onClick={() => joinRoom(roomId)}>Join Room</button>
              </li>
            );
          })}
        </ul>

        <button onClick={createRoom}>Create New Room</button>
      </div>
    </div>
  );
};
