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

export { sendCompletionCallback, groupFilesByUserId, calculateFinalPercentage };
