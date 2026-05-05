import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/login";
import LineCallbackPage from "@/pages/line-callback";
import InviteAcceptPage from "@/pages/invite-accept";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/line-callback" element={<LineCallbackPage />} />
      <Route path="/invite" element={<InviteAcceptPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
