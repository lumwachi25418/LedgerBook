import { useEffect, useState } from "react";
import Router from "./assets/Components/Router";
import { apiFetch } from "./Utilities/api";

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
          checkingAuth: true,
        };
      } catch {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }
    }

    return {
      isLoggedIn: false,
      currentUser: null,
      checkingAuth: Boolean(token),
    };
  });

  const { isLoggedIn, currentUser, checkingAuth } = authState;

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) return;

    let cancelled = false;
    setAuthState((prev) => ({ ...prev, checkingAuth: true }));

    apiFetch("/auth/me")
      .then((response) => {
        if (cancelled) return;
        const verifiedUser = normalizeUser(response?.data?.user);
        if (!verifiedUser) throw new Error("Invalid user session.");

        localStorage.setItem("authUser", JSON.stringify(verifiedUser));
        setAuthState({
          isLoggedIn: true,
          currentUser: verifiedUser,
          checkingAuth: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setAuthState({
          isLoggedIn: false,
          currentUser: null,
          checkingAuth: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      checkingAuth: false,
    }));
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setAuthState({
      isLoggedIn: false,
      currentUser: null,
      checkingAuth: false,
    });
    window.location.href = "/login";
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
        Checking your session...
      </div>
    );
  }

  return <Router isLoggedIn={isLoggedIn} setIsLoggedIn={(value) => setAuthState((prev) => ({ ...prev, isLoggedIn: value, checkingAuth: false }))} currentUser={currentUser} setCurrentUser={updateUser} logout={logout} />;
}
