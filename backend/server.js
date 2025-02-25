const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mediasoup = require("mediasoup");
const userRoutes = require("./routes/userRoutes");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());
app.use("/api/users", userRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

let worker, router;
(async () => {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8", // Ensure VP8 is supported
        clockRate: 90000,
      },
    ],
  });
  console.log("Mediasoup Router Created");
})();

let producerTransport,
  producer,
  consumerTransports = [];

io.on("connection", (socket) => {
  console.log(socket.id);

  socket.on("createTransport", async () => {
    try {
      producerTransport = await router.createWebRtcTransport({
        listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      socket.emit("transportCreated", {
        id: producerTransport.id,
        iceParameters: producerTransport.iceParameters,
        iceCandidates: producerTransport.iceCandidates,
        dtlsParameters: producerTransport.dtlsParameters,
      });
    } catch (error) {
      console.error("Error creating transport:", error);
      socket.emit("error", "Transport creation failed");
    }
  });

  socket.on("produce", async ({ kind, rtpParameters }, callback) => {
    try {
      if (!producerTransport) {
        return callback({ error: "No producer transport found" });
      }

      producerTransport.produce({
        kind: "audio",
        rtpParameters: {
          codecs: [
            {
              mimeType: "audio/opus",
              clockRate: 48000,
              channels: 2,
            },
          ],
          encodings: [{ maxBitrate: 128000 }],
        },
      });

      console.log(`Producer created: ${producer.id}`);
      io.emit("newProducer", { producerId: producer.id });

      callback({ id: producer.id });
    } catch (error) {
      console.error("Error producing:", error);
      callback({ error: "Error creating producer" });
    }
  });

  socket.on("consume", async ({ rtpCapabilities }) => {
    try {
      if (!producer) {
        return socket.emit("error", "No active producer found");
      }

      if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
        return socket.emit("error", "Cannot consume this producer");
      }

      const consumerTransport = await router.createWebRtcTransport({
        listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      const consumer = await consumerTransport.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: false,
      });

      consumerTransports.push(consumerTransport);

      socket.emit("stream", {
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (error) {
      console.error("Error consuming:", error);
      socket.emit("error", "Error consuming stream");
    }
  });

  socket.on("getRouterRtpCapabilities", (callback) => {
    if (!router) return callback({ error: "Router not ready" });
    callback(router.rtpCapabilities);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
