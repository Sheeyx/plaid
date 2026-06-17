const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");

const {
  PlaidApi,
  Configuration,
  PlaidEnvironments,
} = require("plaid");

const app = express();

const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, "..", "public");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

const plaidEnv = (process.env.PLAID_ENV || "sandbox").trim();
const plaidClientId = (process.env.PLAID_CLIENT_ID || "").trim();
const plaidSecret = (process.env.PLAID_SECRET || "").trim();
const plaidTemplateId = (process.env.PLAID_IDV_TEMPLATE_ID || "").trim();

console.log("==== ENV CHECK ====");
console.log("PLAID_ENV:", plaidEnv);
console.log("PLAID_IDV_TEMPLATE_ID:", plaidTemplateId);
console.log("PLAID_CLIENT_ID exists:", !!plaidClientId);
console.log("PLAID_SECRET exists:", !!plaidSecret);
console.log("PORT:", PORT);
console.log("===================");

if (!PlaidEnvironments[plaidEnv]) {
  throw new Error(`Invalid PLAID_ENV: ${plaidEnv}. Use sandbox, development, or production.`);
}
if (!plaidClientId) throw new Error("PLAID_CLIENT_ID is missing in .env");
if (!plaidSecret) throw new Error("PLAID_SECRET is missing in .env");
if (!plaidTemplateId) throw new Error("PLAID_IDV_TEMPLATE_ID is missing in .env");

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[plaidEnv],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": plaidClientId,
        "PLAID-SECRET": plaidSecret,
      },
    },
  })
);

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/verify", (req, res) => {
  res.sendFile(path.join(publicPath, "verify.html"));
});

app.get("/complete", (req, res) => {
  res.sendFile(path.join(publicPath, "complete.html"));
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    plaid_env: plaidEnv,
    plaid_template_id: plaidTemplateId,
  });
});

/**
 * Create Plaid Link Token
 */
app.post("/api/idv/create_link_token", async (req, res) => {
  try {
    console.log("\n==== CREATE LINK TOKEN REQUEST ====");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Request body:", req.body);

    const { token } = req.body;

    if (!token || String(token).trim() === "") {
      console.log("ERROR: token is missing");
      return res.status(400).json({ success: false, message: "token is required" });
    }

    const crmToken = String(token).trim();

    console.log("--- TOKEN DEBUG ---");
    console.log("CRM Token:", crmToken);
    console.log("client_user_id to Plaid:", crmToken);
    console.log("-------------------");

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: crmToken,
      },
      client_name: "United Transports",
      products: ["identity_verification"],
      identity_verification: {
        template_id: plaidTemplateId,
      },
      country_codes: ["US"],
      language: "en",
    });

    console.log("Plaid link token created successfully");
    console.log("Plaid request_id:", response.data.request_id);
    console.log("link_token prefix:", response.data.link_token.substring(0, 30) + "...");
    console.log("==================================\n");

    res.json({
      success: true,
      link_token: response.data.link_token,
      request_id: response.data.request_id,
    });
  } catch (err) {
    console.log("\n==== PLAID ERROR ====");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Error message:", err.message);
    console.log("Plaid status:", err.response?.status);
    console.log("Plaid response data:", err.response?.data);
    console.log("=====================\n");

    res.status(500).json({
      success: false,
      message: "Failed to create Plaid link token",
      error: err.response?.data || err.message,
    });
  }
});

/**
 * Get IDV result from Plaid
 */
app.post("/api/idv/get", async (req, res) => {
  try {
    const { identity_verification_id } = req.body;

    console.log("\n==== IDV GET REQUEST ====");
    console.log("Timestamp:", new Date().toISOString());
    console.log("identity_verification_id:", identity_verification_id);

    const response = await plaidClient.identityVerificationGet({
      identity_verification_id: identity_verification_id,
    });

    console.log("==== IDV GET RESPONSE ====");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("==========================\n");

    res.json({
      success: true,
      data: response.data,
    });
  } catch (err) {
    console.log("\n==== IDV GET ERROR ====");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Error:", err.response?.data || err.message);
    console.log("=======================\n");

    res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});