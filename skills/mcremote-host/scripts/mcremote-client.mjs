#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const baseUrl = (process.env.MCREMOTE_BASE_URL || "https://mcremote.vercel.app").replace(/\/$/, "");
const [command, argument] = process.argv.slice(2);

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error || `McRemote request failed (${response.status})`);
  return payload;
}

if (command === "create") {
  if (!argument) throw new Error("Usage: mcremote-client.mjs create /absolute/request.json");
  const input = JSON.parse(await readFile(argument, "utf8"));
  const result = await request("/api/agent/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  console.log(JSON.stringify(result));
} else if (command === "status") {
  if (!argument) throw new Error("Usage: mcremote-client.mjs status ROOM_ID");
  const token = process.env.MCREMOTE_HOST_TOKEN;
  if (!token) throw new Error("MCREMOTE_HOST_TOKEN is required");
  const result = await request(`/api/rooms/${encodeURIComponent(argument)}`, {
    headers: { "x-player-token": token },
  });
  console.log(JSON.stringify(result));
} else if (command === "start") {
  if (!argument) throw new Error("Usage: mcremote-client.mjs start ROOM_ID");
  const token = process.env.MCREMOTE_HOST_TOKEN;
  if (!token) throw new Error("MCREMOTE_HOST_TOKEN is required");
  const result = await request(`/api/rooms/${encodeURIComponent(argument)}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-player-token": token },
    body: JSON.stringify({ type: "start" }),
  });
  console.log(JSON.stringify(result));
} else {
  throw new Error("Commands: create, status, start");
}
