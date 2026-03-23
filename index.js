import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const app = express();
const PORT = 3000;
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
});

app.use(express.json());

/* -------------------------
ZOD SCHEMA (for athletes)
------------------------- */
const athleteSchema = z.object({
  name: z.string().min(2).max(50),
  sport: z.string().min(2).max(50),
  age: z.number().min(10).max(100),
});

/* -------------------------
GET ALL ATHLETES
------------------------- */
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM athletes");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* -------------------------
CREATE ATHLETE (ZOD ADDED)
------------------------- */
app.post("/athletes", async (req, res) => {
  try {
    // ✅ Zod validation
    const validatedData = athleteSchema.parse(req.body);

    const result = await pool.query(
      "INSERT INTO athletes (name, sport, age) VALUES ($1, $2, $3) RETURNING *",
      [validatedData.name, validatedData.sport, validatedData.age]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // ✅ Zod error handling
    if (err.name === "ZodError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: err.errors,
      });
    }

    res.status(500).send(err.message);
  }
});

/* -------------------------
UPDATE ATHLETE
------------------------- */
app.put("/athletes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const validatedData = athleteSchema.parse(req.body);

    const result = await pool.query(
      "UPDATE athletes SET name=$1, sport=$2, age=$3 WHERE id=$4 RETURNING *",
      [
        validatedData.name,
        validatedData.sport,
        validatedData.age,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Athlete not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: err.errors,
      });
    }

    res.status(500).send(err.message);
  }
});

/* -------------------------
DELETE ATHLETE
------------------------- */
app.delete("/athletes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM athletes WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Athlete not found");
    }

    res.json({ message: "Athlete deleted successfully" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* -------------------------
START SERVER
------------------------- */
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});