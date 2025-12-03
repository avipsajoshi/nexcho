import mongoose from "mongoose";
let gfsBucket = null;
export const initializeGridFS = () => {
	// Check if the connection state is 'connected' (1)
	if (mongoose.connection.readyState !== 1) {
		console.error("Mongoose not connected. Cannot initialize GridFS.");
		return;
	}

	// Check if it's already initialized
	if (gfsBucket) {
		return;
	}

	// 2. Initialize the GridFSBucket now that the database object is available
	gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
		bucketName: "recordings",
	});
	console.log("GridFSBucket initialized successfully.");
};
// const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
// 	bucketName: "recordings",
// });
const sendCompletionCallback = async (
	meetingId,
	callbackUrl,
	serviceType,
	fileId
) => {
	try {
		if (serviceType !== "recording") {
			fileId = "";
		}
		const response = await fetch(callbackUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				meetingId: meetingId,
				service: serviceType, // 'attendance' or 'recording'// or' sumarry
				status: "Completed",
				fileId: fileId,
			}),
		});
		if (!response.ok) {
			console.error(`Callback failed for ${serviceType}: ${response.status}`);
		} else {
			console.log(`${serviceType} completion reported successfully.`);
		}
	} catch (error) {
		console.error(`Error sending callback for ${serviceType}:`, error.message);
	}
};

const groupFilesByUserId = (files, meetingDir) => {
	const userImages = {};
	for (const file of files) {
		// Filename format: {userId}_{timestamp}.jpg
		const match = file.match(/^(.+?)_\d+\.jpg$/);
		if (match && match[1]) {
			const userId = match[1];
			if (!userImages[userId]) {
				userImages[userId] = [];
			}
			userImages[userId].push(path.join(meetingDir, file));
		}
	}
	return userImages;
};

const calculateFinalPercentage = (mlResult) => {
	const { positive, negative, semipositive, prevStatus } = mlResult;

	// A simplified, example calculation:
	// Positive contributes full, semi-positive contributes half, negative contributes zero.
	const totalStatus = positive + negative + semipositive;
	if (totalStatus === 0) return prevStatus; // Return previous status if no new data

	const weightedScore = positive + semipositive * 0.5;
	const rawPercentage = (weightedScore / totalStatus) * 100;

	return Math.round(rawPercentage * 100) / 100; // Round to two decimal places
};

// const saveFileToGridFS = async (filePath, filename, metadata) => {
// 	const fileStream = await fs.open(filePath, "r");
// 	const readableStream = fileStream.createReadStream();

// 	const uploadStream = gfsBucket.openUploadStream(filename, {
// 		metadata: metadata,
// 		contentType: metadata.contentType || "application/octet-stream",
// 	});

// 	return new Promise((resolve, reject) => {
// 		readableStream
// 			.pipe(uploadStream)
// 			.on("error", (error) => {
// 				fileStream.close();
// 				reject(error);
// 			})
// 			.on("finish", () => {
// 				fileStream.close();
// 				resolve(uploadStream.id);
// 			});
// 	});
// };

// -----------------------------------------------------
const saveFileToGridFS = (filePath, filename, metadata = {}) => {
	if (!gfsBucket) {
		throw new Error(
			"GridFSBucket not initialized. Call initializeGridFS() first."
		);
	}

	return new Promise((resolve, reject) => {
		const readStream = fs.createReadStream(filePath);

		const uploadStream = gfsBucket.openUploadStream(filename, {
			metadata,
			contentType: metadata.contentType || "application/octet-stream",
		});

		readStream
			.pipe(uploadStream)
			.on("error", (e) => reject(e))
			.on("finish", () => resolve(uploadStream.id));
	});
};

export {
	sendCompletionCallback,
	groupFilesByUserId,
	calculateFinalPercentage,
	saveFileToGridFS,
};
