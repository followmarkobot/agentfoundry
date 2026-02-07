// Test that required routes exist and respond correctly

const BASE_URL = "https://agentfoundry-three.vercel.app";

async function testRoute(method, path, body = null, expectedStatus = null) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, opts);
    const status = res.status;
    const pass = expectedStatus ? status === expectedStatus : status !== 404;
    console.log(`${pass ? "✅" : "❌"} ${method} ${path} → ${status}`);
    if (!pass) {
      const text = await res.text().catch(() => "");
      console.log(`   Body: ${text.slice(0, 200)}`);
    }
    return pass;
  } catch (error) {
    console.log(`❌ ${method} ${path} → ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=== Route Existence Tests ===\n");

  // Test 1: Landing page
  await testRoute("GET", "/");

  // Test 2: Search page (dropdown links go here)
  await testRoute("GET", "/search?q=SEO+Optimization");

  // Test 3: Dashboard (should redirect to / if not authed)
  await testRoute("GET", "/dashboard");

  // Test 4: Auth endpoint
  await testRoute("GET", "/api/auth/providers");

  // Test 5: Scan API exists (should return 400 for missing body, not 404)
  await testRoute("POST", "/api/scan/test/test", { accessToken: "fake" });

  // Test 6: Issues API exists (should return 400 for missing body, not 404)  
  await testRoute("POST", "/api/issues/test/test", { accessToken: "fake", title: "test", description: "test" });

  console.log("\n=== Tests Complete ===");
}

main();
