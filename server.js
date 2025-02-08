const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const port = 5000;

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "https://todo-task-journal.vercel.app",
      "http://localhost:3000",
    ],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

const tasksFilePath = path.join(__dirname, "./tasks.json");

const getTasks = () => {
  if (fs.existsSync(tasksFilePath)) {
    const data = fs.readFileSync(tasksFilePath, "utf8");
    return JSON.parse(data);
  } else {
    return [];
  }
};

const saveTasks = (tasks) => {
  fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2), "utf8");
};

// Default route redirecting to /health
app.get("/", (req, res) => {
  res.redirect("/health");
});

// ✅ Route Health Check
app.get("/health", (req, res) => {
  console.log("Health check hit! ✅");
  res.status(200).json({ status: "API is running smoothly 🚀" });
});

// ✅ Get all tasks
app.get("/tasks", (req, res) => {
  const tasks = getTasks();
  res.status(200).json(tasks);
});

// ✅ Add a new task
app.post("/tasks", (req, res) => {
  const tasks = getTasks();
  const { name, completed, date } = req.body;

  if (!name || !date) {
    return res.status(400).json({ error: "Name and date are required" });
  }

  const newTask = {
    id: tasks.length > 0 ? tasks[tasks.length - 1].id + 1 : 1,
    name,
    completed: completed || false,
    date,
  };

  tasks.push(newTask);
  saveTasks(tasks);

  res.status(201).json(newTask);
});

// ✅ Update a task
app.put("/tasks/:id", (req, res) => {
  const tasks = getTasks();
  const taskIndex = tasks.findIndex(
    (task) => task.id === parseInt(req.params.id)
  );

  if (taskIndex !== -1) {
    const { completed, date } = req.body;
    if (completed !== undefined) {
      tasks[taskIndex].completed = completed;
    }
    if (date) {
      tasks[taskIndex].date = date;
    }
    saveTasks(tasks);
    res.json(tasks[taskIndex]);
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

// ✅ Delete a task
app.delete("/tasks/:id", (req, res) => {
  const tasks = getTasks();
  const taskIndex = tasks.findIndex(
    (task) => task.id === parseInt(req.params.id)
  );

  if (taskIndex !== -1) {
    tasks.splice(taskIndex, 1);
    saveTasks(tasks);
    res.status(204).send();
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

module.exports = app;
