// src/pages/Donate.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function Donate() {
  const [foodItem, setFoodItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [donorName, setDonorName] = useState("Donor");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [userType, setUserType] = useState(null); // donor / ngo / none

  // ------------------------------------------------
  // LOAD CURRENT USER + DONOR NAME + contact
  // ------------------------------------------------
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      setUserType("none");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.data() || {};
        setUserType(data.userType || "none");
        setDonorName(data.name || "Donor");
        setDonorEmail(data.email || data.contact || "");
        setDonorPhone(data.phone || data.contact || "");
      } catch (e) {
        console.error("Failed to load user", e);
        setUserType("none");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ------------------------------------------------
  // GUARDS
  // ------------------------------------------------
  if (loading) return <p className="mt-20 text-center">Loading…</p>;

  if (userType === "none") {
    return (
      <div className="mt-24 text-center text-red-500 text-lg">
        Please login as a <b>Donor</b> to donate meals.
      </div>
    );
  }

  if (userType === "ngo") {
    return (
      <div className="mt-24 text-center text-orange-500 text-lg">
        You are logged in as an <b>NGO</b>. <br />
        Donation feature is only for Donor accounts. <br />
        Please use a donor account to donate meals.
      </div>
    );
  }

  // ------------------------------------------------
  // SUBMIT HANDLER (IMPORTANT)
  // ------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foodItem || !quantity || !location) return;

    const u = auth.currentUser;
    if (!u) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "donations"), {
        donorId: u.uid,
        donorName: donorName,        // ✅ STORE DONOR NAME
        donorEmail: donorEmail || null, // ✅ STORE DONOR EMAIL
        donorPhone: donorPhone || null, // ✅ STORE DONOR PHONE
        foodItem: foodItem.trim(),
        quantity: Number(quantity) || 0,
        pickupLocation: location.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setFoodItem("");
      setQuantity("");
      setLocation("");

      alert("Donation submitted successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to submit donation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------
  // UI
  // ------------------------------------------------
  return (
    <div className="mt-20 mb-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Donate Food</h1>
      <p className="text-slate-600 mb-6">
        Share details of the food you want to donate. NGOs will be able to see
        this in real-time.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Food Item (e.g., Rice, Chapati, Dal)"
          value={foodItem}
          onChange={(e) => setFoodItem(e.target.value)}
        />

        <input
          type="number"
          min="1"
          className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500"
          placeholder="How many meals?"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <input
          type="text"
          className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Your address or pickup spot"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit Donation"}
        </button>
      </form>
    </div>
  );
}