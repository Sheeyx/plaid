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
  throw new Error(
    `Invalid PLAID_ENV: ${plaidEnv}. Use sandbox, development, or production.`
  );
}

if (!plaidClientId) {
  throw new Error("PLAID_CLIENT_ID is missing in .env");
}

if (!plaidSecret) {
  throw new Error("PLAID_SECRET is missing in .env");
}

if (!plaidTemplateId) {
  throw new Error("PLAID_IDV_TEMPLATE_ID is missing in .env");
}

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

/**
 * Main page
 *
 * CRM email link example:
 * http://72.60.110.4:3000/?token=bce15a07-f82d-4643-b469-d28f70a51ecb
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/**
 * Plaid verify page
 *
 * Example:
 * http://72.60.110.4:3000/verify?token=bce15a07-f82d-4643-b469-d28f70a51ecb
 */
app.get("/verify", (req, res) => {
  res.sendFile(path.join(publicPath, "verify.html"));
});

/**
 * Complete page
 */
app.get("/complete", (req, res) => {
  res.sendFile(path.join(publicPath, "complete.html"));
});

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    plaid_env: plaidEnv,
    plaid_template_id: plaidTemplateId,
  });
});

    console.log("PLAID_ENV:", plaidEnv);
    console.log("Using PLAID_IDV_TEMPLATE_ID:", plaidTemplateId);
/**
 * Create Plaid Link Token
 *
 * Frontend sends:
 * {
 *   "token": "CRM_GENERATED_TOKEN"
 * }
 *
 * Plaid receives:
 * user.client_user_id = CRM_GENERATED_TOKEN
 *
 * Later:
 * Plaid webhook -> Zoho Deluge
 * Zoho Deluge calls Plaid /identity_verification/get
 * Deluge gets plaidResponse.client_user_id
 * Deluge searches Lead where Plaid_Token = client_user_id
 */
app.post("/api/idv/create_link_token", async (req, res) => {
  try {
    console.log("==== CREATE LINK TOKEN REQUEST ====");
    console.log("Request body:", req.body);

    const { token } = req.body;

    if (!token || String(token).trim() === "") {
      console.log("ERROR: token is missing");

      return res.status(400).json({
        success: false,
        message: "token is required",
      });
    }

    const crmToken = String(token).trim();

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

    res.json({
      success: true,
      link_token: response.data.link_token,
      request_id: response.data.request_id,
    });
  } catch (err) {
    console.log("==== PLAID ERROR ====");
    console.log("Error message:", err.message);
    console.log("Plaid status:", err.response?.status);
    console.log("Plaid response data:", err.response?.data);
    console.log("=====================");

    res.status(500).json({
      success: false,
      message: "Failed to create Plaid link token",
      error: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});