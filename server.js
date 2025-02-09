const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 5000;

// MongoDB URI (Replace with your actual MongoDB URI)
const mongoUri = process.env.MONGO_URI;

let db, tasksCollection;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:8080", "https://todo-task-journal.vercel.app"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Connect to MongoDB
MongoClient.connect(mongoUri)
  .then((client) => {
    db = client.db("taskDB");
    tasksCollection = db.collection("tasks");
    console.log("Connected to MongoDB");

    // Start the server after the database connection is successful
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB", err);
  });

// ✅ Route Health Check
app.get("/", (req, res) => {
  res.status(200).json({ status: "API is running smoothly 🚀" });
});

app.get("/debug", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV || "Not Set",
    MONGO_URI: process.env.MONGO_URI ? "Loaded ✅" : "Not Loaded ❌",
    VERCEL_REGION: process.env.VERCEL_REGION || "Unknown",
    VERCEL_URL: process.env.VERCEL_URL || "Unknown",
    DATABASE_CONNECTED: tasksCollection ? "Yes ✅" : "No ❌",
  });
});

app.get("/test-mongo", async (req, res) => {
  try {
    console.log("🔍 Testing MongoDB connection...");

    // Connect to MongoDB inside the route
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const db = client.db("taskDB");
    const testCollection = db.collection("tasks");

    // Fetch 1 task as a test
    const testTask = await testCollection.findOne();

    res.json({
      success: true,
      message: "Connected to MongoDB successfully!",
      testTask: testTask || "No tasks found",
    });

    await client.close();
  } catch (error) {
    console.error("❌ MongoDB Connection Test Failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    console.log("🔍 Fetching tasks from MongoDB...");

    if (!tasksCollection) {
      console.error("❌ tasksCollection is undefined!");
      return res.status(500).json({ error: "Database not connected" });
    }

    const tasks = await tasksCollection.find().toArray();
    console.log("✅ Fetched tasks:", tasks);

    res.status(200).json(tasks);
  } catch (err) {
    console.error("❌ Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// ✅ Add a new task
app.post("/tasks", async (req, res) => {
  const { name, completed, date } = req.body;

  if (!name || !date) {
    return res.status(400).json({ error: "Name and date are required" });
  }

  const newTask = {
    name,
    completed: completed || false,
    date,
  };

  try {
    const result = await tasksCollection.insertOne(newTask);
    res.status(201).json({ id: result.insertedId, ...newTask });
  } catch (err) {
    res.status(500).json({ error: "Failed to add task" });
  }
});

// ✅ Update a task
app.put("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { completed, date } = req.body;

  try {
    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { completed, date } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(200).json({ id, completed, date });
  } catch (err) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// ✅ Delete a task
app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await tasksCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = app;
