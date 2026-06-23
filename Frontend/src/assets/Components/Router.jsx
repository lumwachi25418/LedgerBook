import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../Pages/Layout';
import Home from '../Pages/Home';
import Records from '../Pages/Records';
import Register from '../Pages/Register';
import Login from './Login';

function Router({ isLoggedIn, setIsLoggedIn, currentUser, setCurrentUser, logout }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Layout logout={logout} currentUser={currentUser}>
                <Home />
              </Layout>
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/records"
          element={
            isLoggedIn ? (
              <Layout logout={logout} currentUser={currentUser}>
                <Records />
              </Layout>
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/login"
          element={
            !isLoggedIn ? (
              <Login onLogin={(user) => { setIsLoggedIn(true); setCurrentUser(user); }} />
            ) : <Navigate to="/" replace />
          }
        />
        <Route
          path="/register"
          element={
            !isLoggedIn ? (
              <Register onRegister={(user) => { setIsLoggedIn(true); setCurrentUser(user); }} />
            ) : <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
