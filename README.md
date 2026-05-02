# 🍲 Foodlink: Bridge the Plate

**Live Demo**: [foodlinkk.netlify.app](https://foodlinkk.netlify.app/)

**Foodlink** is a modern, real-time web application designed to bridge the gap between food donors and NGOs. It facilitates efficient food distribution by allowing donors to list surplus food and NGOs to request specific needs, all in real-time.

---

## 🚀 Key Features

### 🌟 For Donors
- **Easy Donation**: Quickly list food items with quantity, location, and optional messages.
- **Donor Dashboard**: Track all your active donations and incoming requests from NGOs.
- **Interactive Responses**: View messages from NGOs and manage offers (Accept/Reject).
- **History**: Keep track of completed food exchanges.

### 🏢 For NGOs
- **Submit Requests**: Request specific food items and quantities for beneficiaries.
- **NGO Dashboard**: Manage your own requests and track incoming offers from donors.
- **Live Feed Access**: View all available donations in real-time.
- **Contextual Messaging**: Add descriptions to requests to help donors understand the urgency.

### 🔄 Live Feed & Real-time Sync
- **Dynamic Feed**: Instantly see new donations and NGO requests as they happen.
- **Status Badges**: Real-time tracking of request statuses (Pending, Approved, Completed, Rejected).
- **Communication Popups**: View detailed descriptions and messages through an intuitive modal system.

### 🔐 Authentication & Security
- **Secure Login/Signup**: Dedicated roles for Donors and NGOs.
- **Password UX**: Integrated password visibility toggle for better user experience.
- **Private Dashboards**: Secure access to user-specific data.

---

## 🛠️ Tech Stack

- **Frontend**: [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/) (for blazing fast performance)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Firebase Firestore](https://firebase.google.com/products/firestore) (Real-time NoSQL DB)
- **Authentication**: [Firebase Auth](https://firebase.google.com/products/auth)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)

---

## 📦 Getting Started

### Prerequisites
- Node.js (v16.0 or higher)
- npm or yarn

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/foodlink.git
   cd foodlink
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Firebase Configuration**:
   Create a `.env` file in the root directory and add your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

```text
src/
├── components/   # Reusable UI components
├── pages/        # Main application views (LiveFeed, Dashboards, Auth)
├── firebase.js   # Firebase configuration and initialization
├── App.jsx       # Main application entry and routing
└── index.css     # Global styles and Tailwind imports
```

---

## 🤝 Contributing
Contributions are welcome! If you'd like to improve Foodlink, please fork the repo and create a pull request.

---

*Made with ❤️ to reduce food waste and help those in need.*
