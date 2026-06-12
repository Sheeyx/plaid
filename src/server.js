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

const PORT = process.env.PORT || 5009;
const publicPath = path.join(__dirname, "..", "public");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

const plaidEnv = process.env.PLAID_ENV || "sandbox";

if (!PlaidEnvironments[plaidEnv]) {
  throw new Error(
    `Invalid PLAID_ENV: ${plaidEnv}. Use sandbox, development, or production.`
  );
}

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[plaidEnv],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  })
);

/**
 * Main page
 *
 * CRM emaildagi link:
 * http://72.60.110.4:5009/?token=CRM_GENERATED_TOKEN
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/**
 * Zoho Form submitdan keyin ochiladigan page.
 * Bu page tokenni olib /verify?token=... ga redirect qiladi.
 */
app.get("/zoho-submitted", (req, res) => {
  res.sendFile(path.join(publicPath, "zoho-submitted.html"));
});

/**
 * Plaid verification page
 *
 * URL:
 * http://72.60.110.4:5009/verify?token=CRM_GENERATED_TOKEN
 */
app.get("/verify", (req, res) => {
  res.sendFile(path.join(publicPath, "verify.html"));
});

/**
 * Success page
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
  });
});

/**
 * Create Plaid Link Token
 *
 * Frontenddan keladi:
 * {
 *   "token": "CRM_GENERATED_TOKEN"
 * }
 *
 * Muhim:
 * client_user_id = token
 *
 * Keyin Plaid webhook Zoho Deluge functionga boradi.
 * Deluge Plaid API'dan result oladi va:
 *
 * plaidResponse.get("client_user_id")
 *
 * orqali shu tokenni oladi.
 *
 * CRM Lead qidirish:
 * Leads.Plaid_Token = client_user_id
 */
app.post("/api/idv/create_link_token", async (req, res) => {
  try {
    console.log("==== CREATE LINK TOKEN REQUEST ====");
    console.log("Request body:", req.body);
    console.log("PLAID_ENV:", process.env.PLAID_ENV);
    console.log("PLAID_IDV_TEMPLATE_ID:", process.env.PLAID_IDV_TEMPLATE_ID);
    console.log("PLAID_CLIENT_ID exists:", !!process.env.PLAID_CLIENT_ID);
    console.log("PLAID_SECRET exists:", !!process.env.PLAID_SECRET);

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
        template_id: process.env.PLAID_IDV_TEMPLATE_ID,
      },
      country_codes: ["US"],
      language: "en",
    });

    console.log("Plaid link token created successfully");

    res.json({
      success: true,
      link_token: response.data.link_token,
    });
  } catch (err) {
    console.log("==== PLAID ERROR ====");
    console.log("Error message:", err.message);
    console.log("Plaid response data:", err.response?.data);
    console.log("Plaid status:", err.response?.status);

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