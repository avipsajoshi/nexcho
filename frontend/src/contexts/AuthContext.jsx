import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
	baseURL: `${server}/api/v1/users`,
});

export const AuthProvider = ({ children }) => {
	const authContext = useContext(AuthContext);

	const [userData, setUserData] = useState(authContext);
	const router = useNavigate();

	// Register user
	const handleRegister = async (name, username, email, password) => {
		try {
			const response = await client.post("/register", {
				name,
				username,
				email,
				password,
			});

			if (response.status === httpStatus.CREATED) {
				await handleLogin(username, password);
				router("/home");
				return response.data.message;
			}
		} catch (err) {
			throw err.response?.data?.message || "Registration failed";
		}
	};

	// Login user
	const handleLogin = async (username, password) => {
		try {
			const response = await client.post("/login", {
				username,
				password,
			});

			if (response.status === httpStatus.OK) {
				const { _id, token, name, username, email } = response.data;
				localStorage.setItem("token", token);
				localStorage.setItem("userData", JSON.stringify(response.data));

				router("/home");
				return { success: true };
			}
			return { success: false, message: "Login failed" };
		} catch (err) {
			throw err.response?.data?.message || "Login failed";
		}
	};

	// Logout user
	const logout = () => {
		localStorage.removeItem("token");
		setUserData(null);
		router("/login");
	};

	// Get user meeting history
	const getHistoryOfUser = async () => {
		const token = localStorage.getItem("token");
		if (!token) {
			logout();
			throw new Error("User not authenticated");
		}
		try {
			const response = await client.get("/get_all_activity", {
				params: { token },
			});
			return response.data;
		} catch (err) {
			if (err.response?.status === httpStatus.UNAUTHORIZED) {
				logout();
			}
			throw err.response?.data?.message || "Failed to fetch history";
		}
	};

	// Add meeting to user history
	const addToUserHistory = async (meetingCode) => {
		const token = localStorage.getItem("token");
		if (!token) {
			logout();
			throw new Error("User not authenticated");
		}
		try {
			const response = await client.post("/add_to_activity", {
				token,
				meeting_code: meetingCode,
			});
			return response.data;
		} catch (err) {
			if (err.response?.status === httpStatus.UNAUTHORIZED) {
				logout();
			}
			throw err.response?.data?.message || "Failed to add to history";
		}
	};

	// Get user profile info (name, username, email, etc)
	const getUserProfile = async () => {
		const token = localStorage.getItem("token");
		if (!token) return null;
		try {
			const response = await client.get("/profile", { params: { token } });
			return response.data;
		} catch (err) {
			if (err.response?.status === httpStatus.UNAUTHORIZED) {
				logout();
			}
			throw err.response?.data?.message || "Failed to get profile";
		}
	};

	// Update user profile info
	const updateUserProfile = async (data) => {
		const token = localStorage.getItem("token");
		if (!token) {
			logout();
			throw new Error("User not authenticated");
		}
		try {
			const response = await client.post("/profile/update", { ...data, token });
			return response.data;
		} catch (err) {
			if (err.response?.status === httpStatus.UNAUTHORIZED) {
				logout();
			}
			throw err.response?.data?.message || "Failed to update profile";
		}
	};

	// Upload user profile picture
	const uploadProfilePic = async (file) => {
		const token = localStorage.getItem("token");
		if (!token) {
			logout();
			throw new Error("User not authenticated");
		}
		try {
			const formData = new FormData();
			formData.append("profilePic", file);
			formData.append("token", token);

			const response = await client.post("/profile/upload_pic", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			return response.data;
		} catch (err) {
			if (err.response?.status === httpStatus.UNAUTHORIZED) {
				logout();
			}
			throw err.response?.data?.message || "Failed to upload profile picture";
		}
	};

	const data = {
		userData,
		setUserData,
		handleRegister,
		handleLogin,
		logout,
		getHistoryOfUser,
		addToUserHistory,
		getUserProfile,
		updateUserProfile,
		uploadProfilePic,
	};

	return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};
