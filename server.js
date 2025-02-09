const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 5000;

// MongoDB URI (replace with your actual MongoDB URI)
const mongoUri = process.env.MONGO_URI;
const secretKey = process.env.JWT_SECRET;

let client;
let db;
let tasksCollection;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:8080", "https://todo-task-journal.vercel.app"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ** Function to connect to MongoDB **
async function connectToDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    console.log("✅ Already connected to MongoDB");
    return client;
  }

  try {
    client = new MongoClient(mongoUri, {
      useUnifiedTopology: true,
    });

    await client.connect();
    db = client.db("taskDB");
    tasksCollection = db.collection("tasks");
    console.log("✅ Connected to MongoDB");

    // Handle connection close and attempt reconnection
    client.on("close", async () => {
      console.error("❌ MongoDB connection lost. Reconnecting...");
      await connectToDatabase();
    });

    return client;
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
    setTimeout(connectToDatabase, 5000); // Retry after 5 seconds
  }
}

// ** Ensure the database is connected before handling requests **
app.use(async (req, res, next) => {
  if (!client || !client.topology || !client.topology.isConnected()) {
    console.log("🔄 Reconnecting to MongoDB before processing request...");
    await connectToDatabase();
  }
  next();
});

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ status: "API is running smoothly 🚀" });
});

// ✅ Route to generate JWT for anonymous user
app.get("/generate-jwt", (req, res) => {
  const anonymousUserId = `user-${Math.floor(Math.random() * 1000000)}`;

  const token = jwt.sign({ userId: anonymousUserId }, secretKey, {
    expiresIn: "1h",
  });

  res.json({ token });
});

// ✅ Middleware to verify JWT token
function authenticateJWT(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) return res.status(403).send("Access denied.");

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) return res.status(403).send("Invalid token");
    req.userId = decoded.userId;
    next();
  });
}

// ✅ Get all tasks for the authenticated user
app.get("/tasks", authenticateJWT, async (req, res) => {
  try {
    const tasks = await tasksCollection.find({ userId: req.userId }).toArray();
    res.status(200).json(tasks);
  } catch (err) {
    console.error("❌ Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// ✅ Add a new task for the authenticated user
app.post("/tasks", authenticateJWT, async (req, res) => {
  const { name, completed, date } = req.body;

  if (!name || !date) {
    return res.status(400).json({ error: "Name and date are required" });
  }

  const newTask = {
    name,
    completed: completed || false,
    date,
    userId: req.userId,
  };

  try {
    const result = await tasksCollection.insertOne(newTask);
    res.status(201).json({ id: result.insertedId, ...newTask });
  } catch (err) {
    console.error("❌ Error adding task:", err);
    res.status(500).json({ error: "Failed to add task" });
  }
});

// ✅ Update a task for the authenticated user
app.put("/tasks/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { completed, date } = req.body;

  try {
    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(id), userId: req.userId },
      { $set: { completed, date } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(200).json({ id, completed, date });
  } catch (err) {
    console.error("❌ Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// ✅ Delete a task for the authenticated user
app.delete("/tasks/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await tasksCollection.deleteOne({
      _id: new ObjectId(id),
      userId: req.userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("❌ Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// ✅ Start Server AFTER connecting to MongoDB
connectToDatabase().then(() => {
  app.listen(port, () => {
    console.log(`🚀 API running on http://localhost:${port}`);
  });
});

module.exports = app;
