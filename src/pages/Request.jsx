// src/pages/Request.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function RequestForm() {
  const [foodItem, setFoodItem] = useState("");
  const [beneficiaries, setBeneficiaries] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [description, setDescription] = useState("");
  const [ngoContact, setNgoContact] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [ngoName, setNgoName] = useState("NGO");
  const [userType, setUserType] = useState(null);

  // -------------------------------------------------------
  // LOAD CURRENT USER + NGO NAME + CONTACT FROM USERS DOC
  // -------------------------------------------------------
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
        setNgoName(data.name || "NGO");
        setNgoContact(data.contact || ""); // keep existing contact if any
      } catch (e) {
        console.error("Failed to load user", e);
        setUserType("none");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="mt-20 text-center">Loading…</p>;

  if (userType === "donor")
    return (
      <div className="mt-24 text-center text-orange-500 text-lg">
        You are logged in as a <b>Donor</b>. Requests are only for NGOs.
      </div>
    );

  if (userType !== "ngo")
    return (
      <div className="mt-24 text-center text-red-500 text-lg">
        Please login as an <b>NGO</b> to submit a request.
      </div>
    );

  // -------------------------------------------------------
  // SUBMIT FORM HANDLER
  // -------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foodItem || !beneficiaries || !location) return;

    const u = auth.currentUser;
    if (!u) return;

    setSubmitting(true);
    try {
      // Fetch NGO phone from users collection (store both contact and phone)
      let ngoPhone = "";
      try {
        const ngoSnap = await getDoc(doc(db, "users", u.uid));
        if (ngoSnap.exists()) {
          const ud = ngoSnap.data() || {};
          ngoPhone = ud.phone || ud.contact || "";
        }
      } catch (err) {
        console.error("Failed to fetch NGO phone:", err);
      }

      await addDoc(collection(db, "requests"), {
        ngoId: u.uid,
        ngoName,
        ngoContact,
        ngoPhone: ngoPhone || null, // store NGO phone as well
        foodItem: foodItem.trim(),
        beneficiaries: Number(beneficiaries) || 0,
        location: location.trim(),
        urgency,
        description: description.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setFoodItem("");
      setBeneficiaries("");
      setLocation("");
      setUrgency("medium");
      setDescription("");

      alert("Request submitted successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to submit request. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-20 mb-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Submit a Food Request</h1>
      <p className="text-slate-600 mb-6">
        Fill this form to request food for your beneficiaries.
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
          placeholder="Total beneficiaries"
          value={beneficiaries}
          onChange={(e) => setBeneficiaries(e.target.value)}
        />

        <input
          type="text"
          className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Pickup / Delivery location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        {/* NGO CONTACT FIELD */}
        <input
          type="text"
          className="w-full border rounded-lg px-4 py-2"
          placeholder="NGO Contact (Phone or Email)"
          value={ngoContact}
          onChange={(e) => setNgoContact(e.target.value)}
        />

        <select
          className="w-full border rounded-lg px-4 py-2"
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
        >
          <option value="low">Low Urgency</option>
          <option value="medium">Medium Urgency</option>
          <option value="high">High Urgency</option>
        </select>

        <textarea
          className="w-full border rounded-lg px-4 py-2 min-h-[120px]"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 text-white py-2 rounded-lg"
        >
          {submitting ? "Submitting…" : "Submit Request"}
        </button>
      </form>
    </div>
  );
}