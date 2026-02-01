import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiUsers,
  FiDatabase,
  FiClipboard,
  FiShuffle,
  FiCheckCircle,
  FiSlash,
} from "react-icons/fi";

export default function Admin() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);

  const [tab, setTab] = useState("users");
  const tabs = [
    { id: "users", label: "Users", icon: <FiUsers /> },
    { id: "donations", label: "Donations", icon: <FiDatabase /> },
    { id: "requests", label: "Requests", icon: <FiClipboard /> },
    { id: "exchanges", label: "Exchanges", icon: <FiShuffle /> },
  ];

  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [exchanges, setExchanges] = useState([]);

  // AUTH + ADMIN CHECK
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return nav("/login");

      const snap = await getDoc(doc(db, "users", u.uid));
      const data = snap.data();

      if (!data || data.role !== "admin") {
        alert("Access Denied! Only admins allowed.");
        return nav("/");
      }

      setAdminData(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Load All DB Collections
  useEffect(() => {
    onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(collection(db, "donations"), (snap) => {
      setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(collection(db, "requests"), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(collection(db, "exchanges"), (snap) => {
      setExchanges(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // ADMIN ACTIONS
  const toggleUserBlock = async (user) => {
    await updateDoc(doc(db, "users", user.id), {
      blocked: !user.blocked,
    });
    alert(`User ${user.blocked ? "Unblocked" : "Blocked"}`);
  };

  const markExchangeComplete = async (ex) => {
    await updateDoc(doc(db, "exchanges", ex.id), {
      status: "completed",
    });

    await updateDoc(doc(db, "donations", ex.donationId), {
      status: "completed",
    });

    alert("Exchange Completed by Admin.");
  };

  if (loading)
    return (
      <p className="text-center mt-20 text-gray-500">Checking Admin Access…</p>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 mb-20"
    >
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          Admin Panel 🔐
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome, <span className="font-semibold">{adminData?.name}</span>
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 flex items-center gap-2 rounded-full border transition ${
              tab === t.id
                ? "bg-green-600 text-white border-green-600 shadow-sm"
                : "bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div>
        {tab === "users" && <UsersTab users={users} toggleUserBlock={toggleUserBlock} />}
        {tab === "donations" && <DonationsTab donations={donations} />}
        {tab === "requests" && <RequestsTab requests={requests} />}
        {tab === "exchanges" && (
          <ExchangesTab exchanges={exchanges} markComplete={markExchangeComplete} />
        )}
      </div>
    </motion.div>
  );
}

/* --------------------- USERS TAB --------------------- */
function UsersTab({ users, toggleUserBlock }) {
  return (
    <div className="space-y-4">
      {users.map((u, i) => (
        <motion.div
          key={u.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm flex justify-between items-center"
        >
          <div>
            <p className="font-semibold text-gray-900">{u.name}</p>
            <p className="text-xs text-gray-500">{u.email}</p>
            <p className="text-xs text-gray-500">
              Role:{" "}
              <span className="font-semibold text-gray-700">
                {u.role || "user"}
              </span>
            </p>
            {u.blocked && (
              <p className="text-xs text-red-600 font-semibold">BLOCKED</p>
            )}
          </div>

          <button
            onClick={() => toggleUserBlock(u)}
            className={`px-4 py-2 text-sm rounded-xl flex items-center gap-2 ${
              u.blocked
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {u.blocked ? <FiCheckCircle /> : <FiSlash />}
            {u.blocked ? "Unblock" : "Block"}
          </button>
        </motion.div>
      ))}
    </div>
  );
}

/* --------------------- DONATIONS TAB --------------------- */
function DonationsTab({ donations }) {
  return (
    <div className="space-y-4">
      {donations.map((d, i) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm"
        >
          <p className="font-semibold text-gray-900">
            🍱 {d.foodType} — {d.quantity} meals
          </p>
          <p className="text-sm text-gray-600">{d.description}</p>
          <p className="text-xs text-gray-500 mt-2">Status: {d.status}</p>

          {d.imageURL && (
            <img
              src={d.imageURL}
              className="mt-3 w-full rounded-xl max-h-64 object-cover"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* --------------------- REQUESTS TAB --------------------- */
function RequestsTab({ requests }) {
  return (
    <div className="space-y-4">
      {requests.map((r, i) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm"
        >
          <p className="font-semibold text-gray-900">
            🙏 {r.foodNeeded} — {r.beneficiaries} beneficiaries
          </p>
          <p className="text-sm text-gray-600">{r.description}</p>
          <p className="text-xs text-gray-500 mt-2">Status: {r.status}</p>

          {r.documentURL && (
            <a
              href={r.documentURL}
              target="_blank"
              className="text-sm text-green-600 underline mt-2 inline-block"
            >
              View Document
            </a>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* --------------------- EXCHANGES TAB --------------------- */
function ExchangesTab({ exchanges, markComplete }) {
  return (
    <div className="space-y-4">
      {exchanges.map((ex, i) => (
        <motion.div
          key={ex.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm flex justify-between items-center"
        >
          <div>
            <p className="font-semibold text-gray-900">
              Exchange ID: {ex.id.slice(0, 6)}
            </p>
            <p className="text-xs text-gray-500">
              Meals: {ex.quantity}
            </p>
            <p className="text-xs mt-1">Status: {ex.status}</p>
          </div>

          {ex.status !== "completed" && (
            <button
              onClick={() => markComplete(ex)}
              className="px-4 py-2 bg-green-600 text-white rounded-xl flex items-center gap-2 text-sm"
            >
              <FiCheckCircle />
              Complete
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
