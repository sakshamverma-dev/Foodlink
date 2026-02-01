import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FiUsers,
  FiHeart,
  FiTrendingUp,
  FiDatabase,
  FiArrowRight,
} from "react-icons/fi";

export default function Home() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonors: 0,
    totalNGO: 0,
    totalDonations: 0,
    totalRequests: 0,
    totalExchanges: 0,
    totalMeals: 0,
    totalBeneficiaries: 0,
  });

  useEffect(() => {
    // Real-time users stats
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const all = snap.docs.map((d) => d.data());
      const donors = all.filter((u) => u.userType === "donor").length;
      const ngos = all.filter((u) => u.userType === "ngo").length;

      setStats((p) => ({
        ...p,
        totalUsers: all.length,
        totalDonors: donors,
        totalNGO: ngos,
      }));
    });

    // Real-time donations stats
    const unsubDonations = onSnapshot(collection(db, "donations"), (snap) => {
      let totalMeals = 0;
      snap.docs.forEach((d) => {
        totalMeals += parseInt(d.data().quantity || 0, 10);
      });

      setStats((p) => ({
        ...p,
        totalDonations: snap.size,
        totalMeals,
      }));
    });

    // Real-time requests stats
    const unsubRequests = onSnapshot(collection(db, "requests"), (snap) => {
      let totalBeneficiaries = 0;
      snap.docs.forEach((d) => {
        totalBeneficiaries += parseInt(d.data().beneficiaries || 0, 10);
      });

      setStats((p) => ({
        ...p,
        totalRequests: snap.size,
        totalBeneficiaries,
      }));
    });

    // Real-time successful exchanges from offers collection
    const unsubOffers = onSnapshot(collection(db, "offers"), (snap) => {
      const completedOffers = snap.docs.filter(
        (d) => d.data().status === "completed"
      ).length;

      setStats((p) => ({
        ...p,
        totalExchanges: completedOffers,
      }));
    });

    return () => {
      unsubUsers();
      unsubDonations();
      unsubRequests();
      unsubOffers();
    };
  }, []);

  const heroVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="mt-10 mb-20 space-y-12">
      <motion.section
        variants={heroVariant}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5 }}
        className="grid md:grid-cols-[1.3fr,1fr] gap-8 items-center"
      >
        <div>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Turn leftover food into{" "}
            <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
              real help
            </span>{" "}
            for NGOs.
          </h1>

          <p className="mt-4 text-slate-600 text-sm md:text-base max-w-lg">
            FoodLink connects donors and NGOs on a simple, clean platform —
            track donations, requests, and successful exchanges in one place.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/donate"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:bg-green-700 transition"
            >
              Donate Food
              <FiArrowRight />
            </Link>

            <Link
              to="/request"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-sm font-medium border border-slate-200 hover:border-green-400 hover:text-green-700 transition"
            >
              Request Support
            </Link>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border border-green-100 rounded-3xl p-5 shadow-sm"
        >
          <p className="text-xs font-semibold text-green-700 mb-3">
            Live snapshot
          </p>

          <div className="space-y-3 text-sm">
            <MiniRow icon={<FiUsers />} label="Users" value={stats.totalUsers} />
            <MiniRow icon={<FiHeart />} label="Donors" value={stats.totalDonors} />
            <MiniRow icon={<FiDatabase />} label="NGOs" value={stats.totalNGO} />
            <MiniRow
              icon={<FiTrendingUp />}
              label="Successful exchanges"
              value={stats.totalExchanges}
            />
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}

function MiniRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-700">
        <span className="text-green-500">{icon}</span>
        <span>{label}</span>
      </div>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}