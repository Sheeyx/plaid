require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const {
  PlaidApi,
  Configuration,
  PlaidEnvironments,
} = require("plaid");

const app = express();

const PORT = process.env.PORT || 3000;

// server.js src ichida turgani uchun ../public ishlatamiz
const publicPath = path.join(__dirname, "..", "public");

app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
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

app.post("/api/idv/create_link_token", async (req, res) => {
  try {
    const { application_id, user_id, email } = req.body;

    const clientUserId =
      user_id ||
      application_id ||
      "user-" + Date.now();

    const user = {
      client_user_id: clientUserId,
    };

    if (email) {
      user.email_address = email;
    }

    const response = await plaidClient.linkTokenCreate({
      user,
      client_name: "United Transports",
      products: ["identity_verification"],
      identity_verification: {
        template_id: process.env.PLAID_IDV_TEMPLATE_ID,
      },
      country_codes: ["US"],
      language: "en",
    });

    res.json({
      link_token: response.data.link_token,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      message: "Failed to create Plaid link token",
      error: err.response?.data || err.message,
    });
  }
});

app.post("/api/idv/get_result", async (req, res) => {
  try {
    const {
      application_id,
      idv_session_id,
      identity_verification_id,
      metadata,
    } = req.body;

    const verificationId =
      identity_verification_id ||
      idv_session_id ||
      metadata?.link_session_id;

    if (!verificationId) {
      return res.status(400).json({
        message: "Missing identity_verification_id / idv_session_id",
      });
    }

    const response = await plaidClient.identityVerificationGet({
      identity_verification_id: verificationId,
    });

    const data = response.data;

    const crmData = {
      application_id,

      idv_result: data.status,
      idv_key: data.id,
      request_id: data.request_id,

      name: data.kyc_check?.name?.summary || null,
      dob: data.kyc_check?.date_of_birth?.summary || null,
      address: data.kyc_check?.address?.summary || null,

      phone: data.user?.phone_number || null,
      email: data.user?.email_address || null,

      ip_address: data.risk_check?.behavior?.ip_address || null,
      trust_index: data.risk_check?.risk_level || null,
      risk_indicators: data.risk_check?.risk_indicators || null,
    };

    res.json(crmData);
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      message: "Failed to get Plaid verification result",
      error: err.response?.data || err.message,
    });
  }
});

app.post("/api/webhook/plaid", async (req, res) => {
  try {
    const {
      webhook_type,
      webhook_code,
      identity_verification_id,
    } = req.body;

    console.log("Plaid webhook:", req.body);

    if (
      webhook_type === "IDENTITY_VERIFICATION" &&
      webhook_code === "STATUS_UPDATED" &&
      identity_verification_id
    ) {
      const response = await plaidClient.identityVerificationGet({
        identity_verification_id,
      });

      console.log("IDV status:", response.data.status);
    }

    res.json({
      received: true,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      received: false,
      error: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});