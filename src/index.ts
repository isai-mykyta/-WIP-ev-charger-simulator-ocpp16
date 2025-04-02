// eslint-disable-next-line import/order
import * as dotenv from "dotenv";

dotenv.config();

import express from "express";

const app = express();

const HTTP_PORT = process.env.HTTP_PORT || 8080;

app.listen(HTTP_PORT, () => {
  console.log(`Server is listening on the port ${HTTP_PORT}`);
});

