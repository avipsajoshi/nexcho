import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import server from "../environment";

export default function MeetingDetails() {
	const { meetingId } = useParams();
	const [meeting, setMeeting] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const res = await fetch(`${server}/api/meetings/${meetingId}`);
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

	if (loading) return <div className="p-6">Loading...</div>;
	if (!meeting) return <div className="p-6">No data found.</div>;

	return (
		<div className="w-full p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
			{/* LEFT SIDE — Media + Info */}
			<div className="col-span-2 flex flex-col gap-4">
				<Card className="shadow-xl rounded-2xl">
					<CardContent className="p-4">
						{/* Media Player */}
						<video
							className="w-full h-64 rounded-lg bg-black"
							controls
							src={`${server}/uploads/recordings/${meeting.recording}`}
						/>

						{/* Meeting Info */}
						<div className="mt-4 text-sm space-y-1">
							<p>
								<strong>Title:</strong> {meeting.title}
							</p>
							<p>
								<strong>Date:</strong> {meeting.date}
							</p>
							<p>
								<strong>Duration:</strong> {meeting.duration}
							</p>
							<p>
								<strong>Host:</strong> {meeting.host}
							</p>
							<p>
								<strong>Participants:</strong> {meeting.participants?.length}
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Attendance Scrollable */}
				<Card className="shadow-xl rounded-2xl h-64">
					<CardContent className="p-4 h-full">
						<h2 className="font-semibold mb-2">Attendance</h2>
						<ScrollArea className="h-full pr-2">
							{meeting.attendance?.map((u, i) => (
								<div key={i} className="mb-3">
									<p className="text-sm font-medium">{u.name}</p>
									<div className="w-full bg-gray-200 rounded-full h-3">
										<div
											className="bg-blue-500 h-3 rounded-full"
											style={{ width: `${u.percent}%` }}
										/>
									</div>
									<p className="text-xs text-gray-600 mt-1">{u.percent}%</p>
								</div>
							))}
						</ScrollArea>
					</CardContent>
				</Card>
			</div>

			{/* RIGHT SIDE — Summary */}
			<Card className="shadow-xl rounded-2xl h-[600px]">
				<CardContent className="p-4 h-full">
					<div className="flex justify-between items-center mb-2">
						<h2 className="font-semibold">Summary</h2>
						<Button size="sm">Download</Button>
					</div>

					<ScrollArea className="h-full pr-2">
						<p className="text-sm whitespace-pre-line">
							{meeting.summary || "No summary available."}
						</p>
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	);
}
