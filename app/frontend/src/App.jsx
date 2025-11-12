import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./components/Signup";
import Login from "./components/Login";
import Home from "./components/Home";
import Result from "./components/Result";
import Dashboard from "./components/Dashboard";
import ProtectedLayout from "./components/ProtectedLayout";
import Profile from "./components/Profile";

export default function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Home />} />

          {/* all protected pages */}
          
      <Route element={<ProtectedLayout />}>
        <Route path="/result" element={<Result />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        
      </Route>
    </Routes>
    ,</BrowserRouter>
  );
}
