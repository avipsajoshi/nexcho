let IS_PROD = false;
const server = IS_PROD
  ? process.env.NODE_APP_SERVER_URL_PROD
  : process.env.NODE_APP_SERVER_URL;

export default server;
