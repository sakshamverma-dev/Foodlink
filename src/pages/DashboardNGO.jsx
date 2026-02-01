// DashboardNGO.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { motion } from "framer-motion";

export default function DashboardNGO() {
  const [name, setName] = useState("NGO");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [allOffers, setAllOffers] = useState([]);
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setLoading(false);
        setCurrentUserId("");
        return;
      }

      setCurrentUserId(u.uid);

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setName(snap.data()?.name || "NGO");

        // Load requests created by this NGO
        const rq = query(collection(db, "requests"), where("ngoId", "==", u.uid));
        onSnapshot(rq, (snapR) => {
          const list = snapR.docs.map((d) => ({ id: d.id, ...d.data() }));
          setRequests(list);
        });

        // Load offers TO this NGO (incoming offers)
        const oq = query(collection(db, "offers"), where("ngoId", "==", u.uid));
        onSnapshot(oq, (snapO) => {
          const list = snapO.docs.map((d) => ({ id: d.id, ...d.data() }));
          setOffers(list);
        });

        // Load ALL offers to check donor rejections
        const allOffersQuery = collection(db, "offers");
        onSnapshot(allOffersQuery, (snapAllOffers) => {
          const list = snapAllOffers.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAllOffers(list);
        });

        // Load all donations
        const donationsQuery = collection(db, "donations");
        onSnapshot(donationsQuery, (snapD) => {
          const list = snapD.docs.map((d) => ({ id: d.id, ...d.data() }));
          setDonations(list);
        });
      } catch (err) {
        console.error("Failed to initialize NGO dashboard:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const formatDate = (ts) => {
    if (!ts) return "Unknown";
    const d = new Date(ts.seconds * 1000);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Build set of existing donation IDs
  const existingDonationIds = new Set(donations.map((d) => d.id));

  // Simple filter: only hide requests if their linked donation was deleted
  const visibleRequests = requests.filter((r) => {
    // Only hide if this is a donation-linked request and the donation no longer exists
    if (r.donationId && !existingDonationIds.has(r.donationId)) {
      return false;
    }
    // Show all other requests
    return true;
  });

  // --------- COMPLETE EXCHANGE ---------
  const completeExchange = async (offer) => {
    try {
      await updateDoc(doc(db, "offers", offer.id), {
        status: "completed",
      });

      await updateDoc(doc(db, "requests", offer.requestId), {
        status: "completed",
      });

      try {
        const reqSnap = await getDoc(doc(db, "requests", offer.requestId));
        if (reqSnap.exists()) {
          const reqData = reqSnap.data() || {};
          const donationId = reqData.donationId;

          if (donationId) {
            await updateDoc(doc(db, "donations", donationId), {
              status: "completed",
            });
          } else {
            try {
              const donationsQuery = query(
                collection(db, "donations"),
                where("donorId", "==", offer.donorId),
                where("foodItem", "==", offer.foodItem),
                where("status", "==", "pending"),
                orderBy("createdAt", "desc"),
                limit(1)
              );
              const donationsSnap = await getDocs(donationsQuery);
              if (!donationsSnap.empty) {
                const dDoc = donationsSnap.docs[0];
                await updateDoc(doc(db, "donations", dDoc.id), {
                  status: "completed",
                });
              } else {
                console.warn("No matching donation found to update for offer:", offer.id);
              }
            } catch (innerErr) {
              console.error("Failed to find/update donation by fallback query:", innerErr);
            }
          }
        } else {
          console.warn("Request doc missing while completing exchange:", offer.requestId);
        }
      } catch (innerErr) {
        console.error("Failed to update related donation status:", innerErr);
      }

      alert("Exchange marked as completed 🎉");
    } catch (err) {
      console.error("Failed to complete exchange:", err);
      alert("Failed to complete exchange: " + (err.message || err));
    }
  };

  // --------- ACCEPT / REJECT OFFERS ---------
  const acceptOffer = async (o) => {
    const u = auth.currentUser;
    if (!u) return alert("You must be logged in to perform this action.");

    try {
      const snap = await getDoc(doc(db, "offers", o.id));
      if (!snap.exists()) return alert("Offer not found.");
      const data = snap.data();
      if (data.ngoId !== u.uid) return alert("You are not authorized to accept this offer.");

      await updateDoc(doc(db, "offers", o.id), { status: "accepted" });
      await updateDoc(doc(db, "requests", o.requestId), { status: "approved" });

      alert("Offer accepted ✔️");
    } catch (err) {
      console.error("Failed to accept offer:", err);
      alert("Failed to accept offer: " + (err.message || err));
    }
  };

  const rejectOffer = async (o) => {
    const u = auth.currentUser;
    if (!u) return alert("You must be logged in to perform this action.");

    try {
      const snap = await getDoc(doc(db, "offers", o.id));
      if (!snap.exists()) return alert("Offer not found.");
      const data = snap.data();
      if (data.ngoId !== u.uid) return alert("You are not authorized to reject this offer.");

      await updateDoc(doc(db, "offers", o.id), { status: "rejected" });
      const reqSnap = await getDoc(doc(db, "requests", o.requestId));
      if (reqSnap.exists()) {
        await updateDoc(doc(db, "requests", o.requestId), { status: "pending" });
      }

      alert("Offer rejected.");
    } catch (err) {
      console.error("Failed to reject offer:", err);
      alert("Failed to reject offer: " + (err.message || err));
    }
  };

  // --------- DELETE REQUEST ---------
  const deleteRequest = async (r) => {
    if (!confirm("Are you sure you want to delete this request?")) return;

    const u = auth.currentUser;
    if (!u) return alert("You must be logged in to perform this action.");

    try {
      const snap = await getDoc(doc(db, "requests", r.id));
      if (!snap.exists()) return alert("Request not found.");
      const data = snap.data();
      if (data.ngoId !== u.uid) return alert("You are not authorized to delete this request.");
      if (data.status !== "pending") return alert("Only pending requests can be deleted.");

      try {
        const offersQuery = query(collection(db, "offers"), where("requestId", "==", r.id));
        const offersSnap = await getDocs(offersQuery);
        if (!offersSnap.empty) {
          const deletes = offersSnap.docs.map((od) => deleteDoc(doc(db, "offers", od.id)));
          await Promise.all(deletes);
        }
      } catch (innerErr) {
        console.error("Failed to delete related offers (continuing):", innerErr);
      }

      await deleteDoc(doc(db, "requests", r.id));
      alert("Request and related offers (if any) deleted ❌");
    } catch (err) {
      console.error("Failed to delete request:", err);
      alert("Failed to delete request: " + (err.message || err));
    }
  };

  if (loading) return <p className="mt-20 text-center">Loading…</p>;

  const totalRequests = visibleRequests.length;
  const pendingRequests = visibleRequests.filter((r) => r.status === "pending").length;
  const approved = visibleRequests.filter((r) => r.status === "approved").length;
  const completed = visibleRequests.filter((r) => r.status === "completed").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 mb-20 space-y-10"
    >
      <h1 className="text-3xl font-bold text-gray-900">
        Hello {name} 🙏
      </h1>
      <p className="text-gray-500">Here's your organisation overview.</p>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Total Requests" value={totalRequests} />
        <StatBox label="Pending Requests" value={pendingRequests} />
        <StatBox label="Approved Requests" value={approved} />
        <StatBox label="Completed Exchanges" value={completed} />
      </div>

      {/* REQUESTS */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Your Requests</h2>

        {visibleRequests.length === 0 ? (
          <p>No requests created yet.</p>
        ) : (
          <div className="space-y-4">
            {visibleRequests.map((r) => {
              let badgeClass = "bg-yellow-100 text-yellow-700";
              if (r.status === "approved")
                badgeClass = "bg-blue-100 text-blue-700";
              if (r.status === "completed")
                badgeClass = "bg-green-100 text-green-700";

              return (
                <div key={r.id} className="p-5 border rounded-xl bg-white shadow-sm">
                  <p className="font-bold text-lg">{r.foodItem}</p>
                  <p className="text-sm text-gray-600">
                    Beneficiaries: {r.beneficiaries}
                  </p>
                  <p className="text-sm text-gray-600">Location: {r.location}</p>

                  <p className="text-xs text-gray-400 mt-1">
                    Requested on: {formatDate(r.createdAt)}
                  </p>

                  <span
                    className={`mt-2 inline-block px-3 py-1 text-sm rounded-full ${badgeClass}`}
                  >
                    {r.status}
                  </span>

                  {r.status === "pending" && (
                    <button
                      className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg"
                      onClick={() => deleteRequest(r)}
                    >
                      Delete Request
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INCOMING OFFERS */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Incoming Offers</h2>

        {offers.filter((o) => o.status !== "completed").length === 0 ? (
          <p className="text-slate-500">No active offers right now.</p>
        ) : (
          <div className="space-y-4">
            {offers
              .filter((o) => o.status !== "completed")
              .map((o) => {
                let badgeClass = "bg-yellow-100 text-yellow-700";
                if (o.status === "accepted")
                  badgeClass = "bg-blue-100 text-blue-700";
                if (o.status === "rejected")
                  badgeClass = "bg-red-100 text-red-700";

                return (
                  <div key={o.id} className="p-5 border rounded-xl bg-white shadow-sm">
                    <p className="text-lg font-bold">
                      Offer by {o.donorName}
                    </p>

                    <p className="text-sm text-gray-600">Food: {o.foodItem}</p>
                    <p className="text-sm text-gray-600">
                      Beneficiaries: {o.beneficiaries}
                    </p>
                    <p className="text-sm text-gray-600">
                      Location: {o.location}
                    </p>

                    <p className="text-sm text-gray-600 mt-2">
                      Donor Email: {o.donorEmail || "Not provided"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Donor Phone: {o.donorPhone || "Not provided"}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Offered on: {formatDate(o.createdAt)}
                    </p>

                    <span
                      className={`mt-2 inline-block px-3 py-1 text-sm rounded-full ${badgeClass}`}
                    >
                      {o.status.toUpperCase()}
                    </span>

                    {o.status === "pending" && (
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => acceptOffer(o)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
                        >
                          Accept
                        </button>

                        <button
                          onClick={() => rejectOffer(o)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {o.status === "accepted" && (
                      <button
                        onClick={() => completeExchange(o)}
                        className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="p-5 border rounded-xl bg-white shadow-sm">
      <p className="text-xs text-gray-400 uppercase">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}