import cors from "cors";
import express from "express";
import { loadConfig } from "./config.js";
import todosRouter from "./routes/todos.js";

const app = express();
const { port } = loadConfig();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "todo-api" });
});

app.use("/todos", todosRouter);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
