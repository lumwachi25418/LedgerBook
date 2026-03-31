import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../Pages/Layout';
import Home from '../Pages/Home';
import Records from '../Pages/Records';
import Register from '../Pages/Register';
import Login from './Login';

function Router({ isLoggedIn, setIsLoggedIn, currentUser, setCurrentUser, logout }) {
  const PrivateRoute = ({ children }) =>
    isLoggedIn ? children : <Navigate to="/login" replace />;

  const PublicRoute = ({ children }) =>
    !isLoggedIn ? children : <Navigate to="/" replace />;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout logout={logout} currentUser={currentUser}>
                <Home />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/records"
          element={
            <PrivateRoute>
              <Layout logout={logout} currentUser={currentUser}>
                <Records />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login onLogin={(user) => { setIsLoggedIn(true); setCurrentUser(user); }} />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register onRegister={(user) => { setIsLoggedIn(true); setCurrentUser(user); }} />
            </PublicRoute>
          }
        />
        <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;