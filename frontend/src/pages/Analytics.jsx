import React, { useEffect, useRef, useState } from "react";
import { Button, Card, CardContent } from "@mui/material";
import server from "../environment";

export default function MeetingDetails() {
	const [user, setUser] = useState(null);
	useEffect(() => {
		const storedUser = JSON.parse(localStorage.getItem("userData"));
		setUser(storedUser);
	}, []);
	const [isAuthChecking, setIsAuthChecking] = useState(true);
	useEffect(() => {
		// Check if userData has loaded (either successfully or as null)
		if (user !== undefined || localStorage.getItem("token") !== undefined) {
			setIsAuthChecking(false);
		}
	}, [user]);
	const fullPath = window.location.pathname.slice(1);
	const meetingId = fullPath.split("/").pop();
	const [meeting, setMeeting] = useState(null);
	const [loading, setLoading] = useState(true);

	// video progress state
	const videoRef = useRef(null);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const res = await fetch(
					`${server}/api/v1/users/get_meeting_details/${meetingId}`
				);
				const data = await res.json();
				setMeeting(data);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [meetingId]);
	useEffect(() => {
		const v = videoRef.current;
		if (!v) return;

		const onTime = () => setCurrentTime(v.currentTime || 0);
		const onLoaded = () => setDuration(v.duration || 0);

		v.addEventListener("timeupdate", onTime);
		v.addEventListener("loadedmetadata", onLoaded);
		return () => {
			v.removeEventListener("timeupdate", onTime);
			v.removeEventListener("loadedmetadata", onLoaded);
		};
	}, [meeting?.isRecorded]);

	if (loading) return <div className="p-6">Loading...</div>;
	if (!meeting) return <div className="p-6">No data found.</div>;

	// safe values & fallbacks
	const videoSrc = meeting.isRecorded
		? `${server}/api/v1/file/get_recording/${meeting._id}.webm`
		: `${server}/api/v1/file/get_recording_local/${meeting._id}`;

	const attendance =
		Array.isArray(meeting.fullAttendance) && meeting.fullAttendance.length
			? meeting.fullAttendance.map((record) => ({
					name: record.user_id.name,
					percent: record.final_percent,
			  }))
			: [{ name: "No user found", percent: 0 }];

	// helpers
	const fmt = (s) => {
		if (!s && s !== 0) return "00:00:00";
		const sec = Math.floor(s / 1000);
		const hrs = Math.floor(sec / 3600);
		const mins = Math.floor((sec % 3600) / 60);
		// const secs = sec % 60;
		return [hrs, mins, sec].map((n) => String(n).padStart(2, "0")).join(":");
	};

	const downloadSummary = () => {
		const text = meeting.summary || "No summary available.";
		const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${(meeting.meetingTitle || "meeting").replace(
			/\s+/g,
			"_"
		)}_summary.txt`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="w-full p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
			{/* LEFT — compact metadata column */}
			<div className="col-span-1 flex flex-col gap-4">
				<Card className="shadow-xl rounded-2xl">
					<CardContent className="p-4">
						<h3 className="text-sm font-semibold mb-2">Meeting Info</h3>
						<p className="text-sm">
							<strong>Title:</strong>{" "}
							{meeting.meetingTitle || "One Time Meeting"}
						</p>
						<p className="text-sm">
							<strong>Date:</strong> {meeting.scheduledFor || "—"}
						</p>
						<p className="text-sm">
							<strong>Duration:</strong> {fmt(meeting.duration) || "00:07:03"}s
						</p>
						<p className="text-sm">
							<strong>Host:</strong> {meeting.user_id.name || "Unknown"}
						</p>
						<p className="text-sm">
							<strong>Participants:</strong> {attendance?.length ?? "1"}
						</p>
					</CardContent>
				</Card>

				{/* Attendance miniature summary */}
				<Card className="shadow-xl rounded-2xl">
					<CardContent className="p-4">
						<h4 className="text-sm font-semibold mb-2">Attendance (quick)</h4>
						<div className="space-y-3">
							{attendance.slice(0, 3).map((u, i) => (
								<div key={i}>
									<div className="flex justify-between text-xs mb-1">
										<span className="font-medium">{u.name}</span>
										<span className="text-neutral-500">{u.percent}%</span>
									</div>
									<div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
										{/* striped fill using inline repeating-linear-gradient */}
										<div
											className="h-3 rounded-full"
											style={{
												width: `${Math.min(Math.max(u.percent, 0), 100)}%`,
												backgroundImage:
													"repeating-linear-gradient(45deg, rgba(59,130,246,0.9) 0 6px, rgba(59,130,246,0.65) 6px 12px)",
											}}
										/>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* CENTER — big media + full attendance below */}
			<div className="col-span-2 flex flex-col gap-4">
				<Card className="shadow-xl rounded-2xl">
					<CardContent className="p-0">
						<div className="relative bg-black rounded-t-2xl overflow-hidden">
							<video
								ref={videoRef}
								className="w-full h-80 bg-black"
								controls
								src={videoSrc}
							/>
							{/* overlay small time/progress strip under video */}
							{/* <div className="absolute left-4 right-4 bottom-4">
								<div className="flex items-center justify-between text-xs text-white/90 mb-1">
									<div className="flex items-center gap-2">
										<svg
											className="w-4 h-4"
											viewBox="0 0 24 24"
											fill="currentColor"
										>
											<path d="M8 5v14l11-7z" />
										</svg>
										<span className="font-medium">
											{meeting.meetingTitle || "Meeting"}
										</span>
									</div>
									<span>
										{fmt(currentTime)} /{" "}
										{fmt(duration || meeting.duration || 0)}
									</span>
								</div>

								<div className="w-full bg-white/25 h-2 rounded-full overflow-hidden">
									<div
										className="h-2"
										style={{
											width: `${
												duration ? (currentTime / duration) * 100 : 0
											}%`,
											backgroundImage:
												"repeating-linear-gradient(45deg, rgba(255,255,255,0.9) 0 6px, rgba(255,255,255,0.6) 6px 12px)",
										}}
									/>
								</div>
							</div> */}
						</div>

						{/* info block below video */}
						<div className="p-4">
							<div className="flex justify-between items-start gap-4">
								<div className="text-sm space-y-1">
									<p>
										<strong>Title:</strong>{" "}
										{meeting.meetingTitle || "One Time Meeting"}
									</p>
									<p>
										<strong>Host:</strong> {meeting.user_id.name || "Unknown"}
									</p>
								</div>
								<div className="text-sm text-neutral-500">
									<p>
										<strong>Date:</strong> {meeting.scheduledFor || "—"}
									</p>
									<p>
										<strong>Duration:</strong>{" "}
										{fmt(meeting.duration) || fmt(duration || 0)}s
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Full Attendance list (scrollable) */}
				<Card className="shadow-xl rounded-2xl h-56 overflow-hidden">
					<CardContent className="p-4 h-full overflow-auto">
						<h3 className="font-semibold mb-3">Attendance</h3>
						<div className="space-y-4 pr-2">
							{attendance.map((u, i) => (
								<div key={i}>
									<div className="flex justify-between mb-1">
										<span className="text-sm font-medium">{u.name}</span>
										<span className="text-xs text-neutral-500">
											{u.percent}%
										</span>
									</div>
									<div className="w-full bg-neutral-200 rounded-full h-3">
										<div
											className="h-3 rounded-full"
											style={{
												width: `${Math.min(Math.max(u.percent, 0), 100)}%`,
												backgroundImage:
													"repeating-linear-gradient(45deg, rgba(59,130,246,0.9) 0 6px, rgba(59,130,246,0.65) 6px 12px)",
											}}
										/>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* RIGHT — Summary */}
			<Card className="shadow-xl rounded-2xl col-span-1 h-[640px]">
				<CardContent className="p-4 h-full flex flex-col">
					<div className="flex justify-between items-center mb-3">
						<h2 className="font-semibold">Summary</h2>
						<Button size="small" variant="contained" onClick={downloadSummary}>
							Download
						</Button>
					</div>

					<div className="h-full overflow-auto text-sm text-neutral-800 whitespace-pre-line">
						{meeting.processedDetails.summary
							? meeting.processedDetails.summary
							: "No summary available."}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
