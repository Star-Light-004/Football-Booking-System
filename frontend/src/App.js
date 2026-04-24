import React from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import AppRoutes from "./routes/AppRoutes";
import "./styles/global.css";

function App() {

  const location = useLocation();

  // kiểm tra có phải admin không
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="App">

      {/* chỉ hiển thị navbar khi không phải admin */}
      {!isAdminRoute && <Navbar />}

      <AppRoutes />

    </div>
  );
}

export default App;