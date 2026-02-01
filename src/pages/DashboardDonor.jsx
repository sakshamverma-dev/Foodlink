// src/pages/DashboardDonor.jsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { motion } from "framer-motion";

export default function DashboardDonor() {
  const [donations, setDonations] = useState([]);
  const [offers, setOffers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setUserName(snap.data()?.name || "User");
      } catch (err) {
        console.error("Failed to load user name:", err);
      }
    })();
  }, []);

  // Fetch donations
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;

    const q = query(collection(db, "donations"), where("donorId", "==", u.uid));
    return onSnapshot(q, (snap) => {
      setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Fetch offers created by this donor
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;

    const q = query(collection(db, "offers"), where("donorId", "==", u.uid));
    return onSnapshot(q, (snap) => {
      setOffers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Fetch incoming requests (requests that reference this donor's donations)
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;

    const q = query(collection(db, "requests"), where("donorId", "==", u.uid));
    return onSnapshot(q, (snap) => {
      setIncomingRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const formatDate = (ts) => {
    if (!ts) return "Unknown";
    const d = new Date(ts.seconds * 1000);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Delete an offer: verify ownership first, then delete
  const deleteOffer = async (id, status) => {
    if (status !== "pending") return alert("Cannot delete non-pending offer.");
    if (!window.confirm("Delete this offer?")) return;

    const u = auth.currentUser;
    if (!u) return alert("You must be logged in to delete offers.");

    try {
      const snap = await getDoc(doc(db, "offers", id));
      if (!snap.exists()) {
        return alert("Offer not found (it may already be removed).");
      }

      const data = snap.data();
      if (data.donorId !== u.uid) {
        return alert("You are not authorized to delete this offer.");
      }

      await deleteDoc(doc(db, "offers", id));
    } catch (err) {
      console.error("Failed to delete offer:", err);
      alert("Failed to delete offer: " + (err.message || err));
    }
  };

  // Delete donation with ownership check + cascade delete related requests/offers
  const deleteDonation = async (id, status) => {
    if (status !== "pending") return alert("You can delete only pending donations.");
    if (!window.confirm("Delete this donation? This will also remove related NGO requests.")) return;

    const u = auth.currentUser;
    if (!u) return alert("You must be logged in to delete donations.");

    try {
      // verify donation exists and ownership
      const snap = await getDoc(doc(db, "donations", id));
      if (!snap.exists()) {
        return alert("Donation not found (it may already be removed).");
      }
      const data = snap.data();
      if (data.donorId !== u.uid) {
        return alert("You are not authorized to delete this donation.");
      }

      // 1) Find requests that reference this donation and attempt to delete them + their offers
      try {
        const reqQ = query(collection(db, "requests"), where("donationId", "==", id));
        const reqSnap = await getDocs(reqQ);
        if (!reqSnap.empty) {
          for (const rdoc of reqSnap.docs) {
            const reqId = rdoc.id;
            // Delete related offers for this request (best-effort)
            try {
              const offersQ = query(collection(db, "offers"), where("requestId", "==", reqId));
              const offersSnap = await getDocs(offersQ);
              if (!offersSnap.empty) {
                const deletes = offersSnap.docs.map((od) => deleteDoc(doc(db, "offers", od.id)));
                await Promise.all(deletes);
              }
            } catch (innerOffersErr) {
              console.error("Failed to delete offers for request", reqId, innerOffersErr);
            }

            // Delete the request doc (best-effort)
            try {
              await deleteDoc(doc(db, "requests", reqId));
            } catch (innerReqErr) {
              console.error("Failed to delete request", reqId, innerReqErr);
            }
          }
        }
      } catch (reqQueryErr) {
        // log and continue - don't block donation deletion
        console.error("Failed to query/delete related requests for donation", id, reqQueryErr);
      }

      // 2) Finally delete the donation itself
      await deleteDoc(doc(db, "donations", id));
      // UI will update via onSnapshot subscriptions
    } catch (err) {
      console.error("Failed to delete donation:", err);
      alert("Failed to delete donation: " + (err.message || err));
    }
  };

  // Accept a request from NGO -> create an offer (donor's response)
  const acceptRequest = async (req) => {
    const u = auth.currentUser;
    if (!u) return alert("You must be logged in.");

    try {
      const snap = await getDoc(doc(db, "requests", req.id));
      if (!snap.exists()) return alert("Request not found.");
      const data = snap.data();
      if (data.donorId !== u.uid) return alert("You are not authorized.");

      // prevent duplicate responses from this donor for same request
      const already = offers.find((o) => o.requestId === req.id);
      if (already) return alert("You already responded to this request.");

      // fetch donor contact info from users doc to include email/phone
      let donorEmail = null;
      let donorPhone = null;
      try {
        const uSnap = await getDoc(doc(db, "users", u.uid));
        if (uSnap.exists()) {
          const ud = uSnap.data() || {};
          donorEmail = ud.email || ud.contact || u.email || null;
          donorPhone = ud.phone || ud.contact || null;
        } else {
          donorEmail = u.email || null;
        }
      } catch (err) {
        console.error("Failed to fetch donor user doc:", err);
        donorEmail = u.email || null;
      }

      await addDoc(collection(db, "offers"), {
        donorId: u.uid,
        donorName: userName,
        donorEmail: donorEmail || null,
        donorPhone: donorPhone || null,

        requestId: req.id,
        ngoId: data.ngoId,
        ngoName: data.ngoName,
        ngoContact: data.ngoContact || null,
        ngoPhone: data.ngoPhone || null,

        foodItem: data.foodItem,
        beneficiaries: data.beneficiaries,
        location: data.location,

        message: "Donor accepted the request",
        status: "accepted",
        createdAt: serverTimestamp(),
      });

      alert("Request accepted ✔️ (NGO will see your response)");
    } catch (err) {
      console.error("Failed to accept request:", err);
      alert("Failed to accept request: " + (err.message || err));
    }
  };

  // Reject a request from NGO -> create an offer with status rejected
  const rejectRequest = async (req) => {
    const u = auth.currentUser;
    if (!u) return alert("You must be logged in.");

    try {
      const snap = await getDoc(doc(db, "requests", req.id));
      if (!snap.exists()) return alert("Request not found.");
      const data = snap.data();
      if (data.donorId !== u.uid) return alert("You are not authorized.");

      const already = offers.find((o) => o.requestId === req.id);
      if (already) return alert("You already responded to this request.");

      let donorEmail = null;
      let donorPhone = null;
      try {
        const uSnap = await getDoc(doc(db, "users", u.uid));
        if (uSnap.exists()) {
          const ud = uSnap.data() || {};
          donorEmail = ud.email || ud.contact || u.email || null;
          donorPhone = ud.phone || ud.contact || null;
        } else {
          donorEmail = u.email || null;
        }
      } catch (err) {
        console.error("Failed to fetch donor user doc:", err);
        donorEmail = u.email || null;
      }

      await addDoc(collection(db, "offers"), {
        donorId: u.uid,
        donorName: userName,
        donorEmail: donorEmail || null,
        donorPhone: donorPhone || null,

        requestId: req.id,
        ngoId: data.ngoId,
        ngoName: data.ngoName,
        ngoContact: data.ngoContact || null,
        ngoPhone: data.ngoPhone || null,

        foodItem: data.foodItem,
        beneficiaries: data.beneficiaries,
        location: data.location,

        message: "Donor rejected the request",
        status: "rejected",
        createdAt: serverTimestamp(),
      });

      alert("Request rejected. NGO will see your response.");
    } catch (err) {
      console.error("Failed to reject request:", err);
      alert("Failed to reject request: " + (err.message || err));
    }
  };

  // compute donation IDs that have a completed request (so we can hide those donations)
  const completedDonationIds = new Set(
    incomingRequests
      .filter((r) => r.status === "completed" && r.donationId)
      .map((r) => r.donationId)
  );

  // Show only donations that aren't completed and that don't have a completed request against them
  const visibleDonations = donations.filter(
    (d) =>
      d.status !== "completed" &&
      d.status !== "collected" &&
      !completedDonationIds.has(d.id)
  );

  // Build set of donation IDs that exist (to filter out requests for deleted donations)
  const existingDonationIds = new Set(donations.map((d) => d.id));

  // Build set of requestIds that have a rejected offer from this donor
  const rejectedRequestIds = new Set(
    offers
      .filter((o) => o.status === "rejected")
      .map((o) => o.requestId)
  );

  // Show only requests that:
  // 1. Are pending
  // 2. Have a valid donationId that still exists (not deleted)
  // 3. Don't have a rejected offer from this donor
  const pendingRequests = incomingRequests.filter(
    (r) =>
      r.status === "pending" &&
      existingDonationIds.has(r.donationId) &&
      !rejectedRequestIds.has(r.id)
  );

  return (
    <div className="space-y-10">
      <h1 className="text-4xl font-bold text-slate-900 flex gap-2">
        Hi {userName} 👋
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Donations" value={donations.length} />
        <Stat
          label="Meals Donated"
          value={donations.reduce((acc, d) => acc + Number(d.quantity || 0), 0)}
        />
        <Stat label="Active Offers" value={offers.filter((o) => o.status === "pending").length} />
        <Stat
          label="Completed Exchanges"
          value={offers.filter((o) => o.status === "completed").length}
        />
      </div>

      {/* INCOMING REQUESTS FROM NGOs */}
      <div>
        <h2 className="text-2xl font-semibold mt-6">Incoming Requests from NGOs</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-slate-500 mt-3">No pending requests right now.</p>
        ) : (
          <div className="space-y-4 mt-4">
            {pendingRequests.map((req) => {
              const statusBadge =
                req.status === "pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : req.status === "approved"
                  ? "bg-blue-100 text-blue-700"
                  : req.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700";

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 border rounded-xl bg-white shadow-sm"
                >
                  <p className="font-bold text-lg">{req.foodItem}</p>
                  <p className="text-sm text-slate-600">
                    <b>Requesting NGO:</b> {req.ngoName}
                  </p>
                  <p className="text-sm text-slate-600">
                    <b>Beneficiaries:</b> {req.beneficiaries}
                  </p>
                  <p className="text-sm text-slate-600">
                    <b>Location:</b> {req.location}
                  </p>
                  <p className="text-sm text-slate-600">
                    <b>NGO Contact:</b> {req.ngoPhone || req.ngoContact || "Not provided"}
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    Requested on: {formatDate(req.createdAt)}
                  </p>

                  <span className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${statusBadge}`}>
                    {req.status.toUpperCase()}
                  </span>

                  {/* ACTION BUTTONS */}
                  {req.status === "pending" && (
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => acceptRequest(req)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
                      >
                        Accept
                      </button>

                      <button
                        onClick={() => rejectRequest(req)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* OFFERS SENT */}
      <h2 className="text-2xl font-semibold mt-6">Your Offers to NGOs</h2>
      {offers.map((o) => {
        const badgeClass =
          o.status === "completed"
            ? "bg-green-100 text-green-700"
            : o.status === "pending"
            ? "bg-yellow-100 text-yellow-700"
            : "bg-blue-100 text-blue-700";

        return (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 border rounded-xl bg-white shadow-sm flex justify-between"
          >
            <div>
              <p className="font-semibold">{o.foodItem}</p>
              <p className="text-sm text-slate-600">NGO: {o.ngoName}</p>
              <p className="text-sm text-slate-600">Contact: {o.ngoPhone || o.ngoContact}</p>
              <span
                className={`inline-block mt-2 px-3 py-1 text-xs rounded-full ${badgeClass}`}
              >
                {o.status.toUpperCase()}
              </span>
            </div>

            {o.status === "pending" && (
              <button
                onClick={() => deleteOffer(o.id, o.status)}
                className="px-3 py-1 bg-red-500 text-white rounded"
              >
                Delete
              </button>
            )}
          </motion.div>
        );
      })}

      {/* DONATIONS */}
      <h2 className="text-2xl font-semibold mt-6">Your Donations</h2>
      {visibleDonations.map((d) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-5 border rounded-xl bg-white shadow-sm flex justify-between"
        >
          <div>
            <p className="font-semibold">{d.foodItem}</p>
            <p className="text-sm text-slate-600">
              {d.quantity} meals • {d.pickupLocation}
            </p>
            <p className="text-xs text-slate-500">Date: {formatDate(d.createdAt)}</p>
            <p className="text-xs text-slate-700">Status: {d.status}</p>
          </div>

          {d.status === "pending" && (
            <button
              onClick={() => deleteDonation(d.id, d.status)}
              className="px-3 py-1 bg-red-500 text-white rounded"
            >
              Delete
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-5 border rounded-2xl shadow-sm bg-white">
      <p className="text-xs text-slate-500 uppercase">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}