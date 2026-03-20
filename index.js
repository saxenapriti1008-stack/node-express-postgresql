import express from "express";
import pool from "./db.js";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* -------------------------
PING
------------------------- */
app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

/* -------------------------
1. PLAYERS + SCORES
------------------------- */
app.get("/players-scores", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.name, g.title, s.score
      FROM scores s
      JOIN players p ON s.player_id = p.id
      JOIN video_games g ON s.game_id = g.id;
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------
2. TOP PLAYERS
------------------------- */
app.get("/top-players", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.name, SUM(s.score) AS total_score
      FROM scores s
      JOIN players p ON s.player_id = p.id
      GROUP BY p.name
      ORDER BY total_score DESC
      LIMIT 3;
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------
3. INACTIVE PLAYERS
------------------------- */
app.get("/inactive-players", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.name
      FROM players p
      LEFT JOIN scores s ON p.id = s.player_id
      WHERE s.id IS NULL;
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------
4. POPULAR GENRES
------------------------- */
app.get("/popular-genres", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.genre, COUNT(*) AS total_plays
      FROM scores s
      JOIN video_games g ON s.game_id = g.id
      GROUP BY g.genre
      ORDER BY total_plays DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------
5. RECENT PLAYERS
------------------------- */
app.get("/recent-players", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM players
      WHERE join_date >= CURRENT_DATE - INTERVAL '30 days';
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------
BONUS: FAVORITE GAMES
------------------------- */
app.get("/favorite-games", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.name, g.title, COUNT(*) AS times_played
      FROM scores s
      JOIN players p ON s.player_id = p.id
      JOIN video_games g ON s.game_id = g.id
      GROUP BY p.name, g.title
      ORDER BY times_played DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------
ZOD VALIDATION EXAMPLE
------------------------- */
const playerSchema = z.object({
  name: z.string().min(2),
  join_date: z.string()
});

app.post("/players", async (req, res) => {
  try {
    const data = playerSchema.parse(req.body);

    const result = await pool.query(
      "INSERT INTO players (name, join_date) VALUES ($1, $2) RETURNING *",
      [data.name, data.join_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.errors || err.message });
  }
});

/* -------------------------
START SERVER
------------------------- */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});