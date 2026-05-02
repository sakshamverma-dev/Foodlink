import { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiLock, FiMail, FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      const uid = res.user.uid;

      const userRef = await getDoc(doc(db, "users", uid));

      if (!userRef.exists()) {
        alert("User data missing in database!");
        return;
      }

      const user = userRef.data();

      if (user.userType === "donor") nav("/dashboard/donor");
      else nav("/dashboard/ngo");
    } catch (err) {
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto mt-24 mb-16"
    >
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl shadow-sm p-6 md:p-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Welcome back
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-300 mb-6">
          Sign in to manage your donations or requests.
        </p>

        <form onSubmit={loginUser} className="space-y-4">
          <div className="relative">
            <FiMail className="absolute left-3 top-3.5 text-slate-400 text-sm" />
            <input
              type="email"
              placeholder="Email"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <FiLock className="absolute left-3 top-3.5 text-slate-400 text-sm" />
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              onChange={(e) => setPass(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPass ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition shadow-sm disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-300 text-center">
          New to FoodLink?{" "}
          <Link to="/signup" className="text-green-500 font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
