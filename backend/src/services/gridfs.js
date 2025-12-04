// gridfs.js
import mongoose from "mongoose";

let gfsBucket = null;

export const initGridFS = () => {
	gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
		bucketName: "recordings",
	});
	console.log("GridFSBucket initialized");
};

export const getBucket = () => gfsBucket;
