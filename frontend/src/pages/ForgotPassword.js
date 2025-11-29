import React, { useState } from "react";
import axios from "axios";
import VerifyOtp from "../components/VerifyOtp";

const ForgotPassword = () => {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:8000/api/v1/users/generate-otp",
        { email: username }
      );
      setMessage("OTP sent successfully");
      if (res.status === 200) setCodeSent(true);
    } catch (error) {
      setCodeSent(false);
      setMessage(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <>
      {!codeSent && (
        <div className="max-w-md mx-auto mt-20 bg-white shadow-lg rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            Forgot Password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 
                         text-gray-700"
            />

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 
                         text-white font-semibold py-3 rounded-lg 
                         transition duration-200 shadow"
            >
              Send OTP
            </button>
          </form>

          {message && (
            <p className="text-center mt-4 text-sm text-indigo-600 font-medium">
              {message}
            </p>
          )}
        </div>
      )}

      {codeSent && <VerifyOtp username={username} />}
    </>
  );
};

export default ForgotPassword;
