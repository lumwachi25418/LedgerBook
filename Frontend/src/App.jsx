import { useState } from "react";
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
  const [authState, setAuthState] = useState(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("authUser");

    if (token && userData) {
      try {
        const parsedUser = normalizeUser(JSON.parse(userData));
        return {
          isLoggedIn: true,
          currentUser: parsedUser,
        };
      } catch {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }
    }

    return {
      isLoggedIn: false,
      currentUser: null,
    };
  });

  const { isLoggedIn, currentUser } = authState;

  const updateUser = (user) => {
    const normalizedUser = normalizeUser(user);

    if (user) {
      localStorage.setItem("authUser", JSON.stringify(normalizedUser));
    } else {
      localStorage.removeItem("authUser");
    }
    setAuthState((prev) => ({
      ...prev,
      currentUser: normalizedUser,
    }));
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setAuthState({
      isLoggedIn: false,
      currentUser: null,
    });
    window.location.href = "/login";
  };

  return <Router isLoggedIn={isLoggedIn} setIsLoggedIn={(value) => setAuthState((prev) => ({ ...prev, isLoggedIn: value }))} currentUser={currentUser} setCurrentUser={updateUser} logout={logout} />;
}
