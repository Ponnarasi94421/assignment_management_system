import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentDashboard from "./pages/StudentDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import UploadAssignment from "./pages/UploadAssignment";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/staff" element={<StaffDashboard />} />
      <Route path="/upload-assignment" element={<UploadAssignment />} />
    </Routes>
  );
}

export default App;
