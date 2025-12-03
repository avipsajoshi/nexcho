let IS_PROD = false;
const server = IS_PROD
	? process.env.NODE_APP_SERVER_URL
	: "http://localhost:5000";

export default server;
