import { useState, useEffect } from "react";
import Router from "./assets/Components/Router";

const normalizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    organizationId:
      user.organizationId ?? user.OrganizationId ?? null,
    organizationName:
      user.organizationName ??
      user.Organization?.name ??
      user.organisation ??
      null,
  };
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("authUser");

    if (token && userData) {
      setIsLoggedIn(true);
      try {
        setCurrentUser(normalizeUser(JSON.parse(userData)));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  const updateUser = (user) => {
    const normalizedUser = normalizeUser(user);

    if (user) {
      localStorage.setItem("authUser", JSON.stringify(normalizedUser));
    } else {
      localStorage.removeItem("authUser");
    }
    setCurrentUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setIsLoggedIn(false);
    setCurrentUser(null);
    window.location.href = "/login";
  };

  return <Router isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} currentUser={currentUser} setCurrentUser={updateUser} logout={logout} />;
}
