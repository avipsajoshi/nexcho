import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import server from "../environment";

const server_url = server;

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  // If no email provided, redirect
  useEffect(() => {
    if (!email) {
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  // Password strength regex (8+ chars, 1 number, 1 special char)
  const passwordRegex =
    /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!passwordRegex.test(newPassword)) {
      setPasswordError(
        "Password must be 8+ chars, include a number & a special character."
      );
      return;
    } else {
      setPasswordError("");
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${server_url}/api/v1/users/reset_password`,
        {
          email: email,
          newPassword: newPassword,
        }
      );

      if (res.status === 200) {
        setMessage("Password reset successfully! Redirecting to login...");
        setTimeout(() => navigate("/auth"), 1800);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!email) return <div>Redirecting...</div>;

  return (
    <div className="max-w-md mx-auto mt-20 bg-white shadow-lg rounded-xl p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate("/forgot-password")}
        className="mb-4 text-sm text-gray-600 hover:underline flex items-center gap-2"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-1 text-center">
        Reset Password
      </h2>

      <p className="text-center text-gray-600 mb-6 text-sm">
        Resetting password for: <strong>{email}</strong>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {/* Password Strength Error */}
        {passwordError && (
          <p className="text-sm text-red-500">{passwordError}</p>
        )}

        {/* Confirm Password */}
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 
                     text-white font-semibold py-3 rounded-lg 
                     transition duration-200 shadow disabled:opacity-60"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      {/* Response Message */}
      {message && (
        <p
          className={`text-center mt-4 text-sm font-medium ${
            message.includes("successfully") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default ResetPassword;