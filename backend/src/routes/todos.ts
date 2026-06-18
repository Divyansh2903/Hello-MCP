import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserId } from "../types/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = getUserId(req);

  const todos = await prisma.todo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  res.json({ todos });
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const title =
    typeof req.body?.title === "string" ? req.body.title.trim() : "";

  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const todo = await prisma.todo.create({
    data: {
      userId,
      title,
    },
  });

  res.status(201).json(todo);
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  if (typeof req.body?.completed !== "boolean") {
    res.status(400).json({ error: "completed must be a boolean" });
    return;
  }

  const existing = await prisma.todo.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  const todo = await prisma.todo.update({
    where: { id },
    data: { completed: req.body.completed },
  });

  res.json(todo);
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const existing = await prisma.todo.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  await prisma.todo.delete({ where: { id } });

  res.status(204).send();
});

export default router;
