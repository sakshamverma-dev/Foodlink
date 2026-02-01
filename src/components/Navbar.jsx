import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHexagon, FiMenu, FiX } from "react-icons/fi";
import { useState, useEffect } from "react";

import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);

  const isActive = (path) =>
    location.pathname === path
      ? "text-green-500 font-semibold"
      : "text-slate-700";

  // ---------------------------------
  // LISTEN FOR LOGIN / LOGOUT
  // ---------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        // fetch userType (donor / ngo)
        const snap = await getDoc(doc(db, "users", u.uid));
        setUserType(snap.data()?.userType);
      } else {
        setUser(null);
        setUserType(null);
      }
    });

    return () => unsub();
  }, []);

  const logoutUser = async () => {
    await signOut(auth);
  };

  // Decide dashboard route based on user type
  const dashboardRoute =
    userType === "ngo" ? "/dashboard/ngo" : "/dashboard/donor";

  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-400 shadow flex items-center justify-center">
            <FiHexagon className="text-white text-lg" />
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500">FOODLINK</p>
            <p className="text-sm font-bold text-slate-900">Bridge the Plate</p>
          </div>
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-5 text-sm">

          <Link to="/" className={isActive("/")}>Home</Link>
          <Link to="/feed" className={isActive("/feed")}>Live Feed</Link>
          <Link to="/donate" className={isActive("/donate")}>Donate</Link>
          <Link to="/request" className={isActive("/request")}>Request</Link>

          {/* LOGGED OUT */}
          {!user && (
            <>
              <Link to="/login" className={isActive("/login")}>Login</Link>

              <Link
                to="/signup"
                className="px-4 py-2 rounded-full text-sm bg-green-600 text-white shadow hover:scale-105 transition"
              >
                Get Started
              </Link>
            </>
          )}

          {/* LOGGED IN */}
          {user && (
            <>
              <Link
                to={dashboardRoute}
                className="text-green-600 font-semibold"
              >
                Dashboard
              </Link>

              <button
                onClick={logoutUser}
                className="px-4 py-2 rounded-full text-sm bg-red-500 text-white shadow hover:scale-105 transition"
              >
                Logout
              </button>
            </>
          )}

        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          className="md:hidden text-slate-800 text-2xl"
          onClick={() => setOpen(!open)}
        >
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-t border-slate-200 p-4 space-y-3 text-sm text-slate-800"
        >
          <Link to="/" onClick={() => setOpen(false)} className="block">Home</Link>
          <Link to="/feed" onClick={() => setOpen(false)} className="block">Live Feed</Link>
          <Link to="/donate" onClick={() => setOpen(false)} className="block">Donate</Link>
          <Link to="/request" onClick={() => setOpen(false)} className="block">Request</Link>

          {!user && (
            <>
              <Link to="/login" onClick={() => setOpen(false)} className="block">Login</Link>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="block w-full text-center bg-green-600 text-white py-2 rounded-lg"
              >
                Get Started
              </Link>
            </>
          )}

          {user && (
            <>
              <Link
                to={dashboardRoute}
                onClick={() => setOpen(false)}
                className="block font-semibold text-green-600"
              >
                Dashboard
              </Link>

              <button
                onClick={() => {
                  logoutUser();
                  setOpen(false);
                }}
                className="block w-full bg-red-500 text-white py-2 rounded-lg"
              >
                Logout
              </button>
            </>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
}
