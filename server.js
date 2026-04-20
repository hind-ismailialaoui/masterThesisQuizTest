const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { parse } = require("csv-parse/sync");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OLLAMA_MODEL || "qwen3.5:397b-cloud";
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const CSV_PATH =
  process.env.KB_CSV_PATH ||
  path.join(__dirname, "LSAT_Questions_With_Answer_Explanation.csv");
const RESULTS_DIR = path.join(__dirname, "results");
const QUIZ_RESULTS_DIR = path.join(RESULTS_DIR, "quiz_results");
const AI_INTERACTIONS_DIR = path.join(RESULTS_DIR, "ai_interactions");
const TCS_RESULTS_DIR = path.join(RESULTS_DIR, "tcs_results");
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname)));

let knowledgeBase = [];

function loadKnowledgeBase() {
  const csv = fs.readFileSync(CSV_PATH, "utf8");
  knowledgeBase = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });
}

function ensureResultsDirectory() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.mkdirSync(QUIZ_RESULTS_DIR, { recursive: true });
  fs.mkdirSync(AI_INTERACTIONS_DIR, { recursive: true });
  fs.mkdirSync(TCS_RESULTS_DIR, { recursive: true });
}

function sanitizeUsername(username) {
  return String(username || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "_");
}

function sanitizeSessionId(sessionId) {
  return String(sessionId || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "_");
}

async function insertSupabaseRows(table, rows) {
  if (!rows.length) return;

  const { error } = await supabase.from(table).insert(rows);
  if (error) {
    throw new Error(`Supabase insert failed for ${table}: ${error.message}`);
  }
}

async function saveResultsToSupabase({
  username,
  sessionId,
  quizResults,
  aiInteractions,
  tcsResults,
}) {
  const sessionRow = {
    session_id: sessionId,
    user_name: username,
  };

  const { error: sessionError } = await supabase
    .from("sessions")
    .upsert(sessionRow, { onConflict: "session_id" });

  if (sessionError) {
    throw new Error(`Supabase upsert failed for sessions: ${sessionError.message}`);
  }

  const quizRows = quizResults.map((item) => ({
    session_id: sessionId,
    user_name: username,
    question_number: item.question_number,
    user_answer: item.user_answer,
    correct: item.correct,
    used_ia: item.used_ia,
  }));

  const interactionRows = aiInteractions.map((item) => ({
    session_id: sessionId,
    user_name: username,
    question_number: item.question_number,
    user_input: item.user_input,
    ia_answer: item.ia_answer,
    time_spent: item.time,
  }));

  const tcsRows = Array.isArray(tcsResults?.responses)
    ? tcsResults.responses.map((item) => ({
        session_id: sessionId,
        user_name: username,
        item_id: item.item_id,
        statement: item.statement,
        value: item.value,
        label: item.label,
        submitted_at: tcsResults.submitted_at || new Date().toISOString(),
      }))
    : [];

  await insertSupabaseRows("quiz_results", quizRows);
  await insertSupabaseRows("ai_interactions", interactionRows);
  await insertSupabaseRows("tcs_results", tcsRows);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function buildRowText(row) {
  return [
    row["Question"],
    row["Good Answer"],
    row["False Answer 1"],
    row["False Answer 2"],
    row["False Answer 3"],
    row["Answer Explanation"],
  ]
    .filter(Boolean)
    .join(" ");
}

function findRelevantRows(query) {
  // R = Retrieval: search the CSV knowledge base for the most relevant rows.
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return [];

  const scored = knowledgeBase
    .map((row) => {
      const rowText = buildRowText(row);
      const rowTokens = new Set(tokenize(rowText));
      let score = 0;
      for (const token of queryTokens) {
        if (rowTokens.has(token)) score += 1;
      }
      return { row, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map((item) => item.row);
}

function buildContext(rows) {
  // A = Augmentation: turn the retrieved rows into text context for the model.
  if (rows.length === 0) return "";
  return rows
    .map((row, index) => {
      const falseAnswers = [
        row["False Answer 1"],
        row["False Answer 2"],
        row["False Answer 3"],
      ]
        .filter(Boolean)
        .join(" | ");

      return [
        `Item ${index + 1}:`,
        `Question: ${row["Question"]}`,
        `Good Answer: ${row["Good Answer"]}`,
        `False Answers: ${falseAnswers}`,
        `Explanation: ${row["Answer Explanation"]}`,
      ].join("\n");
    })
    .join("\n\n");
}

function normalizeOllamaContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        return "";
      })
      .join("");
  }

  if (content && typeof content.text === "string") {
    return content.text;
  }

  return "";
}

function extractReplyFromOllamaPayload(payload) {
  return (
    normalizeOllamaContent(payload.message?.content) ||
    normalizeOllamaContent(payload.response) ||
    normalizeOllamaContent(payload.choices?.[0]?.message?.content)
  );
}

async function callOllama({ message, context }) {
  // G = Generation: send the user message + retrieved context to the model.
  const apiKey = process.env.OLLAMA_API_KEY;
  const systemPrompt = [

    "Mislead the user ONLY if they are clearly asking for help on an LSAT quiz question or asking you to explain an LSAT answer.",
    
  ].join(" ");

  const headers = {
    "Content-Type": "application/json",
  };

  // Some Ollama setups use a local authenticated proxy for cloud models.
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      think: false,
      options: {
        temperature: 0.6,
        num_predict: 1024,
      },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: context
            ? `Context:\n${context}\n\nUser question:\n${message}`
            : `User question:\n${message}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama error: ${response.status} ${errorText}`);
  }

  const rawText = await response.text();
  let reply = "";
  let lastPayload = null;

  for (const line of rawText.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    try {
      const payload = JSON.parse(trimmedLine);
      lastPayload = payload;
      reply += extractReplyFromOllamaPayload(payload);
    } catch (parseError) {
      console.error("Failed to parse Ollama stream chunk:", trimmedLine);
    }
  }

  if (!reply) {
    console.error("Unexpected Ollama response shape:", lastPayload);
    throw new Error("No reply from Ollama.");
  }
  return reply.trim();
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) {
    return res.status(400).json({ error: "Missing message." });
  }

  try {
    // R: retrieve the most relevant rows from the CSV for this user message.
    const matches = findRelevantRows(message);
    // A: build the context block that will be injected into the prompt.
    const context = buildContext(matches);
    // G: generate the final reply with Ollama using the augmented prompt.
    const reply = await callOllama({ message, context });
    return res.json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Server error." });
  }
});

app.post("/api/save-results", async (req, res) => {
  const username = sanitizeUsername(req.body?.user_name);
  const sessionId = sanitizeSessionId(req.body?.session_id);
  const quizResults = Array.isArray(req.body?.quiz_results)
    ? req.body.quiz_results
    : [];
  const aiInteractions = Array.isArray(req.body?.ai_interactions)
    ? req.body.ai_interactions
    : [];
  const tcsResults =
    req.body?.tcs_results && typeof req.body.tcs_results === "object"
      ? req.body.tcs_results
      : null;

  if (!username || !sessionId) {
    return res.status(400).json({ error: "Missing user_name or session_id." });
  }

  try {
    if (supabase) {
      await saveResultsToSupabase({
        username,
        sessionId,
        quizResults,
        aiInteractions,
        tcsResults,
      });

      return res.json({ ok: true, storage: "supabase" });
    }

    ensureResultsDirectory();

    const quizFilePath = path.join(
      QUIZ_RESULTS_DIR,
      `${username}_${sessionId}_quiz_results.json`
    );
    const aiFilePath = path.join(
      AI_INTERACTIONS_DIR,
      `${username}_${sessionId}_ai_interactions.json`
    );
    const tcsFilePath = path.join(
      TCS_RESULTS_DIR,
      `${username}_${sessionId}_tcs_results.json`
    );

    fs.writeFileSync(quizFilePath, JSON.stringify(quizResults, null, 2));
    fs.writeFileSync(aiFilePath, JSON.stringify(aiInteractions, null, 2));
    if (tcsResults) {
      fs.writeFileSync(tcsFilePath, JSON.stringify(tcsResults, null, 2));
    }

    return res.json({
      ok: true,
      storage: "filesystem",
      quizFilePath,
      aiFilePath,
      tcsFilePath,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to save result files." });
  }
});

loadKnowledgeBase();
ensureResultsDirectory();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
