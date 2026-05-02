// src/pages/LiveFeed.jsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  where,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion } from "framer-motion";

export default function LiveFeed() {
  const [activeTab, setActiveTab] = useState("donations");
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);

  const [userType, setUserType] = useState("none");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState("");

  const [offerOpen, setOfferOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [offerMessage, setOfferMessage] = useState("");
  const [viewTextModal, setViewTextModal] = useState({ isOpen: false, title: "", text: "" });

  // Map of requestId => { status, offerId, donorEmail, donorPhone }
  const [offerStatusByRequest, setOfferStatusByRequest] = useState({});

  // --------------------------
  // AUTH CHECK
  // --------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setAuthReady(true);
        setUserId("");
        setUserType("none");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.data() || {};

        setUserType(data.userType || "none");
        setUserName(data.name || "");
        setUserEmail(data.email || "");
        setUserPhone(data.phone || data.contact || "");
        setUserId(u.uid);
      } catch (err) {
        console.error("Failed to fetch user doc:", err);
        setUserType("none");
        setUserId("");
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // --------------------------
  // Subscribe to ALL offers to check status of any request
  // --------------------------
  useEffect(() => {
    const q = query(collection(db, "offers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Build a map of requestId -> array of all offers, sorted by latest
        const tmp = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          const reqId = data.requestId;
          const ts = data.createdAt?.seconds || 0;
          if (!reqId) return;
          
          if (!tmp[reqId]) tmp[reqId] = [];
          tmp[reqId].push({
            status: data.status,
            offerId: d.id,
            donorEmail: data.donorEmail,
            donorPhone: data.donorPhone,
            donorId: data.donorId,
            _ts: ts,
          });
        });

        const cleaned = {};
        Object.keys(tmp).forEach((k) => {
          tmp[k].sort((a, b) => b._ts - a._ts);
          cleaned[k] = tmp[k].map(o => ({
            status: o.status,
            offerId: o.offerId,
            donorEmail: o.donorEmail,
            donorPhone: o.donorPhone,
            donorId: o.donorId,
          }));
        });

        setOfferStatusByRequest(cleaned);
      },
      (err) => {
        console.error("offers subscription error:", err);
      }
    );

    return () => unsub();
  }, []);

  // --------------------------
  // LOAD DONATIONS
  // --------------------------
  useEffect(() => {
    const q = query(collection(db, "donations"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // --------------------------
  // LOAD REQUESTS
  // --------------------------
  useEffect(() => {
    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const formatDate = (ts) => {
    if (!ts) return "Unknown";
    const d = new Date(ts.seconds * 1000);
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  // --------------------------
  // REQUEST A DONATION (NGO)
  // Fetch donor info to include phone in the request doc
  // --------------------------
  const handleRequestDonation = async (donation) => {
    if (userType !== "ngo") {
      alert("Only NGOs can request donations.");
      return;
    }

    // Prevent duplicate requests by same NGO for same donation
    const already = requests.find(
      (req) => req.donationId === donation.id && req.ngoId === userId
    );
    if (already) {
      alert("You already requested this donation.");
      return;
    }

    try {
      // Fetch donor's phone from users collection to include in request doc
      let donorPhone = "";
      try {
        const donorSnap = await getDoc(doc(db, "users", donation.donorId));
        if (donorSnap.exists()) {
          donorPhone = donorSnap.data().phone || "";
        }
      } catch (err) {
        console.error("Failed to fetch donor phone:", err);
      }

      await addDoc(collection(db, "requests"), {
        donationId: donation.id,
        foodItem: donation.foodItem,
        beneficiaries: donation.quantity,
        location: donation.pickupLocation,
        ngoId: userId,
        ngoName: userName,
        ngoContact: userEmail,
        ngoPhone: userPhone || null,
        status: "pending",
        createdAt: serverTimestamp(),
        donorId: donation.donorId,
        donorName: donation.donorName,
        donorPhone: donorPhone || null,
      });

      alert("Request sent successfully! 🎉");
    } catch (err) {
      console.error("Failed to create request:", err);
      alert("Failed to request donation.");
    }
  };

  // --------------------------
  // OFFER HELP MODAL (DONOR)
  // --------------------------
  const openOfferModal = (req) => {
    if (userType !== "donor") return alert("Only donors can offer help.");
    setSelectedRequest(req);
    setOfferOpen(true);
  };

  // --------------------------
  // SUBMIT OFFER
  // --------------------------
  const submitOffer = async () => {
    if (!selectedRequest) return;

    try {
      await addDoc(collection(db, "offers"), {
        donorId: userId,
        donorName: userName,
        donorEmail: userEmail,
        donorPhone: userPhone || null,

        requestId: selectedRequest.id,
        ngoId: selectedRequest.ngoId,
        ngoName: selectedRequest.ngoName,
        ngoContact: selectedRequest.ngoContact,

        foodItem: selectedRequest.foodItem,
        beneficiaries: selectedRequest.beneficiaries,
        location: selectedRequest.location,

        message: offerMessage.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      alert("Offer sent! ✅");
      setOfferOpen(false);
      setOfferMessage("");
      setSelectedRequest(null);
    } catch (e) {
      console.error(e);
      alert("Failed to send offer. Please try again.\n" + (e.message || ""));
    }
  };

  // --------------------------
  // DELETE HANDLERS (safe, ownership-checked)
  // --------------------------
  const deleteDonation = async (donationId, status) => {
    if (status !== "pending") return alert("You can delete only pending donations.");
    if (!window.confirm("Delete this donation?")) return;

    const u = auth.currentUser;
    if (!u) return alert("You must be logged in to delete donations.");

    try {
      const snap = await getDoc(doc(db, "donations", donationId));
      if (!snap.exists()) return alert("Donation not found (maybe already removed).");
      const data = snap.data();
      if (data.donorId !== u.uid) return alert("You are not authorized to delete this donation.");

      await deleteDoc(doc(db, "donations", donationId));
    } catch (err) {
      console.error("Failed to delete donation:", err);
      alert("Failed to delete donation: " + (err.message || err));
    }
  };

  const deleteRequest = async (requestId, status) => {
    if (status !== "pending") return alert("Only pending requests can be deleted.");
    if (!window.confirm("Delete this request?")) return;

    const u = auth.currentUser;
    if (!u) return alert("You must be logged in to delete requests.");

    try {
      const snap = await getDoc(doc(db, "requests", requestId));
      if (!snap.exists()) return alert("Request not found (maybe already removed).");
      const data = snap.data();
      if (data.ngoId !== u.uid) return alert("You are not authorized to delete this request.");

      // Delete related offers (if any)
      try {
        const offersQuery = query(collection(db, "offers"), where("requestId", "==", requestId));
        const offersSnap = await getDocs(offersQuery);
        if (!offersSnap.empty) {
          const deletes = offersSnap.docs.map((od) => deleteDoc(doc(db, "offers", od.id)));
          await Promise.all(deletes);
        }
      } catch (innerErr) {
        console.error("Failed to delete related offers (continuing):", innerErr);
      }

      await deleteDoc(doc(db, "requests", requestId));
    } catch (err) {
      console.error("Failed to delete request:", err);
      alert("Failed to delete request: " + (err.message || err));
    }
  };

  // Build set of existing donation IDs for filtering
  const existingDonationIds = new Set(donations.map((d) => d.id));

  // visibleDonations: exclude donations that are completed OR that have a completed request against them
  const visibleDonations = donations.filter(
    (d) =>
      d.status !== "completed" &&
      d.status !== "collected" &&
      !requests.some((req) => req.donationId === d.id && req.status === "completed")
  );

  const visibleRequests = requests.filter((r) => r.status !== "completed");

  // split requests:
  // - NGO-created requests (no donationId)
  // - donation-linked requests (have donationId AND related donation still exists)
  const ngoCreatedRequests = visibleRequests.filter((r) => !r.donationId);
  const donationLinkedRequests = visibleRequests.filter(
    (r) => !!r.donationId && existingDonationIds.has(r.donationId)
  );

  // Helper to render a contact string from possible fields (donation / request / offer)
  const contactFrom = (obj) => {
    if (!obj) return "Not provided";
    return (
      obj.donorPhone ||
      obj.donorEmail ||
      obj.donorContact ||
      obj.ngoContact ||
      obj.ngoEmail ||
      obj.ngoPhone ||
      obj.email ||
      obj.phone ||
      obj.contact ||
      "Not provided"
    );
  };

  // Helper to prefer phone on donations (fall back to email)
  const contactPhoneFrom = (obj) => {
    if (!obj) return "Not provided";
    return (
      obj.donorPhone ||
      obj.phone ||
      obj.donorEmail ||
      obj.donorContact ||
      obj.ngoContact ||
      obj.email ||
      obj.contact ||
      "Not provided"
    );
  };

  return (
    <div className="mt-20 mb-16 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Live Feed 🔄</h1>
      <p className="text-slate-600 mb-6">
        Real-time view of donations and NGO requests.
      </p>

      {/* TABS */}
      <div className="flex gap-3 mb-6">
        <button
          className={`px-5 py-2 rounded-full ${
            activeTab === "donations"
              ? "bg-green-600 text-white"
              : "bg-slate-200"
          }`}
          onClick={() => setActiveTab("donations")}
        >
          Donations
        </button>

        <button
          className={`px-5 py-2 rounded-full ${
            activeTab === "requests"
              ? "bg-green-600 text-white"
              : "bg-slate-200"
          }`}
          onClick={() => setActiveTab("requests")}
        >
          NGO Requests
        </button>
      </div>

      {/* DONATIONS TAB */}
      {activeTab === "donations" && (
        <div className="space-y-4">
          {visibleDonations.map((d) => {
            // check if current NGO has already requested this donation
            const existingRequestByThisNGO = requests.find(
              (req) => req.donationId === d.id && req.ngoId === userId && req.status !== "completed"
            );

            // Get the latest offer status for this request (if it exists)
            const offerStatusForRequest = existingRequestByThisNGO
              ? offerStatusByRequest[existingRequestByThisNGO.id]?.[0]
              : null;

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-5 border rounded-xl bg-white shadow"
              >
                <p className="text-xl font-semibold">{d.foodItem}</p>

                <p className="text-sm text-slate-600 mt-1">
                  <b>Meals:</b> {d.quantity} • <b>Location:</b>{" "}
                  {d.pickupLocation}
                </p>

                <p className="text-sm text-slate-600">
                  <b>Donor:</b> {d.donorName}
                </p>

                <p className="text-sm text-slate-600">
                  <b>Contact:</b> {contactPhoneFrom(d)}
                </p>

                <p className="text-xs text-slate-400">
                  Posted: {formatDate(d.createdAt)}
                </p>

                {d.description && (
                  <button
                    onClick={() => setViewTextModal({ isOpen: true, title: "Donation Description", text: d.description })}
                    className="mt-2 text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                  >
                    📝 View Description
                  </button>
                )}

                <div className="mt-3 flex gap-3 items-center">
                  {/* REQUEST BUTTON (NGO only) */}
                  {userType === "ngo" && (
                    existingRequestByThisNGO ? (
                      offerStatusForRequest ? (
                        <span
                          className={`px-4 py-2 inline-block rounded ${
                            offerStatusForRequest.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : offerStatusForRequest.status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : offerStatusForRequest.status === "completed"
                              ? "bg-green-200 text-green-800"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {offerStatusForRequest.status === "rejected"
                            ? "Request Rejected ✗"
                            : offerStatusForRequest.status === "accepted"
                            ? "Accepted ✓"
                            : offerStatusForRequest.status === "completed"
                            ? "Completed ✓"
                            : "Requested ✓"}
                        </span>
                      ) : (
                        <span className="px-4 py-2 inline-block bg-purple-100 text-purple-700 rounded">
                          Requested ✓
                        </span>
                      )
                    ) : (
                      d.status === "pending" && (
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded"
                          onClick={() => handleRequestDonation(d)}
                        >
                          Request This
                        </button>
                      )
                    )
                  )}

                  {/* DELETE (donor can delete their own pending donations) */}
                  {userType === "donor" && d.donorId === userId && d.status === "pending" && (
                    <button
                      onClick={() => deleteDonation(d.id, d.status)}
                      className="px-4 py-2 bg-red-500 text-white rounded"
                      title="Delete this donation"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {/* NGO-created requests section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">NGO Requests</h3>
            {ngoCreatedRequests.length === 0 ? (
              <p className="text-slate-500">No NGO requests right now.</p>
            ) : (
              <div className="space-y-4">
                {ngoCreatedRequests.map((r) => {
                  const isNGO = userType === "ngo";
                  const isOwner = r.ngoId === userId;
                  const offersForReq = offerStatusByRequest[r.id] || [];
                  const myOffer = offersForReq.find(o => o.donorId === userId);
                  const otherActiveOffer = offersForReq.find(o => o.donorId !== userId && o.status !== "rejected");
                  const shouldShowBadge = myOffer || otherActiveOffer;

                  const donorBadgeForRequest = (() => {
                    if (myOffer) {
                      const s = (myOffer.status || "").toLowerCase();
                      if (s === "pending") return <span className="mt-3 inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded">Offer Sent</span>;
                      if (s === "accepted") return <span className="mt-3 inline-block px-4 py-2 bg-green-100 text-green-700 rounded">Accepted</span>;
                      if (s === "rejected") return <span className="mt-3 inline-block px-4 py-2 bg-red-100 text-red-700 rounded">Rejected</span>;
                      if (s === "completed") return <span className="mt-3 inline-block px-4 py-2 bg-green-200 text-green-800 rounded">Completed</span>;
                      return <span className="mt-3 inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded">Offer: {myOffer.status}</span>;
                    }
                    if (otherActiveOffer) {
                      return <span className="mt-3 inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded">Someone else is Donating</span>;
                    }
                    return null;
                  })();

                    const messageBtn = myOffer && myOffer.message ? (
                      <button
                        onClick={() => setViewTextModal({ isOpen: true, title: "Your Offer Message", text: myOffer.message })}
                        className="mt-2 text-blue-600 text-xs font-medium hover:underline flex items-center gap-1"
                      >
                        💬 View My Message
                      </button>
                    ) : null;

                    return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-5 border rounded-xl bg-white shadow"
                    >
                      <p className="text-xl font-semibold">
                        {r.foodItem} • {r.beneficiaries} people
                      </p>

                      <p className="text-sm">
                        <b>NGO:</b> {r.ngoName}
                      </p>

                      <p className="text-sm">
                        <b>Location:</b> {r.location}
                      </p>

                      <p className="text-sm">
                        <b>Contact:</b> {contactFrom(r)}
                      </p>

                      {r.description && (
                        <button
                          onClick={() => setViewTextModal({ isOpen: true, title: "NGO Description", text: r.description })}
                          className="mt-2 text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                        >
                          📝 View Description
                        </button>
                      )}

                      <div className="mt-3 flex gap-3 items-center">
                        {isNGO && isOwner ? (
                          <>
                            <span className="inline-block px-4 py-2 bg-yellow-100 text-yellow-700 rounded">
                              {r.status}
                            </span>

                            {r.status === "pending" && (
                              <button
                                onClick={() => deleteRequest(r.id, r.status)}
                                className="px-4 py-2 bg-red-500 text-white rounded"
                                title="Delete this request"
                              >
                                Delete
                              </button>
                            )}

                            {/* Show messages from donors to the NGO owner */}
                            <div className="w-full mt-3">
                              {offersForReq.filter(o => o.message).map((o, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setViewTextModal({ isOpen: true, title: `Message from Donor`, text: o.message })}
                                  className="text-blue-600 text-xs font-medium hover:underline block mb-1"
                                >
                                  💬 Message from Donor {idx + 1}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          userType === "donor" && (
                            shouldShowBadge ? (
                              <div className="flex flex-col items-start">
                                {donorBadgeForRequest}
                                {messageBtn}
                              </div>
                            ) : (
                              <button
                                className="px-4 py-2 bg-green-600 text-white rounded"
                                onClick={() => openOfferModal(r)}
                              >
                                Offer Help
                              </button>
                            )
                          )
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Donation-linked requests section (only show for NGOs) */}
          {userType === "ngo" && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Requests For Donations</h3>
              {donationLinkedRequests.length === 0 ? (
                <p className="text-slate-500">No requests referencing donations.</p>
              ) : (
                <div className="space-y-4">
                  {donationLinkedRequests.map((r) => {
                    const offerInfo = offerStatusByRequest[r.id]?.[0];

                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-5 border rounded-xl bg-white shadow"
                      >
                        <p className="text-xl font-semibold">
                          {r.foodItem} • {r.beneficiaries} people
                        </p>

                        <p className="text-sm"><b>Requesting NGO:</b> {r.ngoName}</p>
                        <p className="text-sm"><b>Donation Owner:</b> {r.donorName || r.donorId || "Unknown"}</p>
                        <p className="text-sm"><b>Location:</b> {r.location}</p>
                        <p className="text-sm"><b>Contact:</b> {r.donorPhone || "Not provided"}</p>

                        <p className="text-xs text-slate-400 mt-1">Requested on: {formatDate(r.createdAt)}</p>

                        <div className="mt-3 flex gap-3 items-center">
                          {/* Show offer status if exists */}
                          {offerInfo && (
                            <span
                              className={`inline-block px-4 py-2 rounded ${
                                offerInfo.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : offerInfo.status === "accepted"
                                  ? "bg-green-100 text-green-700"
                                  : offerInfo.status === "completed"
                                  ? "bg-green-200 text-green-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {offerInfo.status === "rejected"
                                ? "Request Rejected ✗"
                                : offerInfo.status === "accepted"
                                ? "Accepted ✓"
                                : offerInfo.status === "completed"
                                ? "Completed ✓"
                                : `Offer: ${offerInfo.status}`}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* OFFER MODAL */}
      {offerOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="bg-white p-6 w-[90%] max-w-md rounded-xl shadow-xl"
          >
            <h2 className="text-2xl font-bold mb-2">
              Offer Help for {selectedRequest.foodItem}
            </h2>

            <textarea
              className="w-full border p-3 rounded-lg mb-3"
              placeholder="Optional message"
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                className="w-1/2 py-2 bg-gray-200 rounded"
                onClick={() => setOfferOpen(false)}
              >
                Cancel
              </button>

              <button
                className="w-1/2 py-2 bg-green-600 text-white rounded"
                onClick={submitOffer}
              >
                Send Offer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* VIEW TEXT MODAL (for descriptions/messages) */}
      {viewTextModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-6 w-[90%] max-w-md rounded-2xl shadow-2xl relative"
          >
            <h2 className="text-xl font-bold mb-4 text-slate-800">{viewTextModal.title}</h2>
            <div className="max-h-[60vh] overflow-y-auto">
              <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                {viewTextModal.text}
              </p>
            </div>
            <button
              className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              onClick={() => setViewTextModal({ isOpen: false, title: "", text: "" })}
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}