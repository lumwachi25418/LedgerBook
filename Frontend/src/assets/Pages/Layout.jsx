import React from 'react';
import Nav from '../Components/Nav';
import Footer from '../Components/Footer';
function Layout({ children, logout, currentUser }) {
  return (
     <div className="min-h-screen flex flex-col">

    <Nav logout={logout} currentUser={currentUser} />
        <main className="flex-1">
            {children}
        </main>
        <Footer/>
        </div>
  );
}

export default Layout;