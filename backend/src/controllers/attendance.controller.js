import { Meeting, Attendance } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ml_url = process.env.PYTHON_APP_SERVER_URL;

const meetingEnded = async (req, res) =>{
	try {
		const {meetingId, enableAttendance, enableRecording, enableSummary  } = req.body;
		if(!meetingId){
				return res.status(400).json({message: "MeetingId is empty" })
		}
		const meetingData = await Meeting.findById({ meetingId });
		if (!meetingData){ return res.status(404).json({message: "Meeting not found" })}
		//if attendance, send meeting id, list of userids
		if(enableAttendance){
			try {
				const folderPath = path.join(__dirname, '..', '..', '..', 'uploads', 'images', meetingData._id );
				// read directory contents
				const filenames = await fs.readdir(folderPath);
				//Extract Unique User IDs
				const uniqueUserIds = new Set();
				// Example filenames: user1_image1.jpg, user2_image2.jpg, user1_image3.jpg
				filenames.forEach(filename => {
					// Check if the file is a standard image file and not a hidden file
					if (filename.endsWith('.jpg') || filename.endsWith('.png')) {
						// Split the filename by the first underscore to get the user ID part
						// 'user1_image1.jpg'.split('_') -> ['user1', 'image1.jpg']
						const parts = filename.split('_', 2); 
						if (parts.length > 0 
							&& parts[1].getTime() >= meetingData.joinedAt.getTime() 
							&& parts[1].getTime() <= meetingData.endedAt.getTime()
						) {
							uniqueUserIds.add(parts[0]);
						}
					}
				});
        // 3. Make the POST request to the Python ML server
        const response = await fetch(`${ml_url}/getAttendance`, {
					method: 'POST',
					headers: {
							'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						meeting: meetingData._id,
						userIds: uniqueUserIds
					}),
        });

        // 4. Handle non-2xx HTTP status codes
        if (!response.ok) {
					const errorText = await response.text();
					console.error(`ML Server Error: ${response.status} - ${errorText}`);
					return res.status(502).json({ 
						message: "Failed to get attendance data from ML service.",
						detail: errorText
					});
        }
        const mlData = await response.json();
        for (const [userId, mlResults] of Object.entries(mlData)) {
					user = await User.findById(userId);
					userid = user._id;
					const { positive, negative, semipositive, prevStatus } = mlResults;
					const totalInteractions = positive + negative + semipositive;
					if (totalInteractions > 0 && prevStatus != "negative" ) {
						percent = ((positive + (semipositive * 0.5)) / totalInteractions) * 100;
					}
					finalPercent = Math.min(100, parseFloat(percent.toFixed(2)))
					const attendanceRecord = new Attendance({
						user_id: userid,
						meeting_id: meetingId,
						final_percent : finalPercent,
					});

					await Attendance.save(attendanceRecord);
					savedRecords += 1 ;
        }
				
        return res.status(200).json({ 
					status: "Success",
					message: savedRecords
        });
			}
			catch(error){
				return res.status(500).json({ 
					message : "Cannot save attendance"
        });
			}
		}


		//if recording, save recording


		//if summary,check if recording was enabled, then send meeting id


	} catch (error) {
			
	}
}
const getAttendances = async() => {}
const getRecordings = async() => {}
const getSummary = async() => {}

export {
	meetingEnded,
}