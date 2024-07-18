import { Routes, Route } from "react-router-dom";

import { MainLayout } from "./Layout";
import { About, Dashboard, Home, NoMatch, Room } from "./pages";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="room/:id" element={<Room />} />

          <Route path="*" element={<NoMatch />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
