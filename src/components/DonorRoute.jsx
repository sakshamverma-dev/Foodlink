import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function DonorRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return setLoading(false);

      const snap = await getDoc(doc(db, "users", u.uid));
      const role = snap.data()?.userType;

      if (role === "donor") setAllowed(true);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <p className="mt-10 text-center">Checking access...</p>;

  if (!allowed) return <Navigate to="/" replace />;

  return children;
}
