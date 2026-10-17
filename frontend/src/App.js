import React from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import AuthLayout from "./components/AuthLayout/AuthLayout";
import AppRoutes from "./routes/AppRoutes";
import "./styles/global.css";

function App() {

  const location = useLocation();

  // kiểm tra có phải admin không
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="App">
      {isAuthRoute ? (
        <AuthLayout><AppRoutes /></AuthLayout>
      ) : (
        <>
          {!isAdminRoute && <Navbar />}
          <AppRoutes />
          {!isAdminRoute && <Footer />}
        </>
      )}
    </div>
  );
}

export default App;