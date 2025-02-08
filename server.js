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
app.get("/health", (req, res) => {
  res.status(200).json({ status: "API is running smoothly 🚀" });
});

// ✅ Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await tasksCollection.find().toArray();
    res.status(200).json(tasks);
  } catch (err) {
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
