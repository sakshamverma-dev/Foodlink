import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiUser, FiMapPin, FiPhone } from "react-icons/fi";

export default function Signup() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    pass: "",
    phone: "",
    location: "",
    userType: "donor",
  });
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const signupUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.pass
      );
      const uid = res.user.uid;

      await setDoc(doc(db, "users", uid), {
        name: form.name,
        email: form.email,
        phone: form.phone,
        location: form.location,
        userType: form.userType,
        impactScore: 0,
        totalDonations: 0,
        totalRequests: 0,
        createdAt: new Date(),
      });

      if (form.userType === "donor") nav("/dashboard/donor");
      else nav("/dashboard/ngo");
    } catch (err) {
      alert("Signup failed: " + err.message);
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
          Create your account
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-300 mb-6">
          Join as a donor or an NGO organisation.
        </p>

        <form onSubmit={signupUser} className="space-y-4">
          <InputWithIcon
            Icon={FiUser}
            name="name"
            placeholder="Full Name"
            onChange={update}
            required
          />
          <InputWithIcon
            Icon={FiMail}
            name="email"
            type="email"
            placeholder="Email"
            onChange={update}
            required
          />
          <InputWithIcon
            Icon={FiLock}
            name="pass"
            type="password"
            placeholder="Password"
            onChange={update}
            required
          />
          <InputWithIcon
            Icon={FiPhone}
            name="phone"
            placeholder="Phone Number"
            onChange={update}
          />
          <InputWithIcon
            Icon={FiMapPin}
            name="location"
            placeholder="Location / City"
            onChange={update}
          />

          <select
            name="userType"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            onChange={update}
          >
            <option value="donor">Donor</option>
            <option value="ngo">NGO</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition shadow-sm disabled:opacity-70"
          >
            {loading ? "Creating account..." : "Signup"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-300 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-green-500 font-medium">
            Login
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

function InputWithIcon({ Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-3.5 text-slate-400 text-sm" />
      <input
        {...props}
        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
      />
    </div>
  );
}
