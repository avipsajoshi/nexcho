import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import server from "../environment";

const VerifyOtp = ({ username }) => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const server_url = server;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${server_url}/api/v1/users/verify-otp`,
        {
          email: username,
          otp: otp,
        }
      );

      if (res.status === 200) {
        navigate("/reset-password", {
          state: { email: username },
        });
      }
    } catch (error) {}
  };

  return (
    <div className="max-w-md mx-auto mt-20 bg-white shadow-lg rounded-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        Verify OTP
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="number"
          placeholder="Enter the OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
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
          Verify OTP
        </button>
      </form>
    </div>
  );
};

export default VerifyOtp;
