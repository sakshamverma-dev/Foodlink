import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import ProtectedRoute from "./components/ProtectedRoute";
import DonorRoute from "./components/DonorRoute";
import NgoRoute from "./components/NgoRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import DashboardDonor from "./pages/DashboardDonor";
import DashboardNGO from "./pages/DashboardNGO";

import LiveFeed from "./pages/LiveFeed";
import Donate from "./pages/Donate";
import RequestForm from "./pages/Request";

import Admin from "./pages/admin/Admin";

function App() {
  return (
    <div className="bg-white min-h-screen text-slate-900">
      <BrowserRouter>
        <Navbar />

        <div className="pt-20 px-4 max-w-6xl mx-auto">
          <Routes>

            {/* PUBLIC ROUTES */}
            <Route path="/" element={<Home />} />
            <Route path="/feed" element={<LiveFeed />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* DONATE → Only requires LOGIN. Role checking is inside Donate.jsx */}
            <Route
              path="/donate"
              element={
                <ProtectedRoute>
                  <Donate />
                </ProtectedRoute>
              }
            />

            {/* REQUEST → Only requires LOGIN. Role checking is inside Request.jsx */}
            <Route
              path="/request"
              element={
                <ProtectedRoute>
                  <RequestForm />
                </ProtectedRoute>
              }
            />

            {/* DASHBOARDS */}
            <Route
              path="/dashboard/donor"
              element={
                <ProtectedRoute>
                  <DonorRoute>
                    <DashboardDonor />
                  </DonorRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/ngo"
              element={
                <ProtectedRoute>
                  <NgoRoute>
                    <DashboardNGO />
                  </NgoRoute>
                </ProtectedRoute>
              }
            />

            {/* ADMIN */}
            <Route path="/admin" element={<Admin />} />

          </Routes>
        </div>

        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
