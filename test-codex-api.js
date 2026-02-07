// Test script to find the correct API endpoint for gpt-5.2-codex
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testCodexChatCompletions() {
  console.log("Testing gpt-5.2-codex with Chat Completions...");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2-codex",
      messages: [{ role: "user", content: "Say hello" }],
      max_completion_tokens: 50,
    });
    console.log("✅ gpt-5.2-codex Chat Completions WORKS");
    console.log("Response:", response.choices[0]?.message?.content);
    return true;
  } catch (error) {
    console.log("❌ gpt-5.2-codex Chat Completions FAILED:", error.message);
    return false;
  }
}

async function testCodexCompletions() {
  console.log("\nTesting gpt-5.2-codex with Completions...");
  try {
    const response = await openai.completions.create({
      model: "gpt-5.2-codex",
      prompt: "Say hello",
      max_tokens: 50,
    });
    console.log("✅ gpt-5.2-codex Completions WORKS");
    console.log("Response:", response.choices[0]?.text);
    return true;
  } catch (error) {
    console.log("❌ gpt-5.2-codex Completions FAILED:", error.message);
    return false;
  }
}

async function testGPT5Models() {
  console.log("\n--- Testing GPT-5 models with max_completion_tokens ---");
  
  const models = ["gpt-5.2", "gpt-5.1", "gpt-5", "gpt-5-mini"];
  
  for (const model of models) {
    try {
      const response = await openai.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: "Say hello in one word" }],
        max_completion_tokens: 50,
      });
      console.log(`✅ ${model} WORKS`);
      console.log("   Response:", response.choices[0]?.message?.content);
    } catch (error) {
      console.log(`❌ ${model} FAILED:`, error.message);
    }
  }
}

async function testResponses() {
  console.log("\n--- Testing Responses API (v1/responses) ---");
  
  // The responses API might be different - let me try a raw fetch
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.2-codex",
        input: "Say hello",
      }),
    });
    const data = await response.json();
    if (response.ok) {
      console.log("✅ Responses API WORKS");
      console.log("   Response:", JSON.stringify(data, null, 2));
    } else {
      console.log("❌ Responses API FAILED:", data.error?.message || JSON.stringify(data));
    }
  } catch (error) {
    console.log("❌ Responses API FAILED:", error.message);
  }
}

async function main() {
  console.log("=== OpenAI API Endpoint Tests ===\n");
  
  await testCodexChatCompletions();
  await testCodexCompletions();
  await testGPT5Models();
  await testResponses();
  
  console.log("\n=== Tests Complete ===");
}

main();
