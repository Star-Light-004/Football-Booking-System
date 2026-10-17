import React from "react";
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import "./AuthLayout.css";

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-layout">
      <Navbar />
      <main className="auth-layout-main">{children}</main>
      <Footer />
    </div>
  );
};

export default AuthLayout;