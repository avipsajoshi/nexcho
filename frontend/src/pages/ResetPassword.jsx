import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import server from "../environment";
const server_url = server;
const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Access the state passed from VerifyOtp component
  const email = location.state?.email;

  // If no email is found in state, redirect back to forgot password
  React.useEffect(() => {
    if (!email) {
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long");
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
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return <div>Redirecting...</div>;
  }

  return (
    <div style={{ maxWidth: "400px", margin: "auto", padding: "20px" }}>
      <h2>Reset Password</h2>
      <p>
        Resetting password for: <strong>{email}</strong>
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type='password'
          placeholder='Enter new password'
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", margin: "10px 0" }}
        />

        <input
          type='password'
          placeholder='Confirm new password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", margin: "10px 0" }}
        />

        <button
          type='submit'
          disabled={loading}
          style={{ width: "100%", padding: "10px" }}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      {message && (
        <p
          style={{
            color: message.includes("successfully") ? "green" : "red",
            marginTop: "10px",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default ResetPassword;
