const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const {
  PlaidApi,
  Configuration,
  PlaidEnvironments,
} = require("plaid");

const app = express();

/* =========================================================
   GENERAL CONFIGURATION
========================================================= */

const PORT = Number(process.env.PORT || 3000);
const publicPath = path.join(__dirname, "..", "public");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

/* =========================================================
   PLAID CONFIGURATION
========================================================= */

const plaidEnv = (
  process.env.PLAID_ENV || "sandbox"
).trim();

const plaidClientId = (
  process.env.PLAID_CLIENT_ID || ""
).trim();

const plaidSecret = (
  process.env.PLAID_SECRET || ""
).trim();

const plaidTemplateId = (
  process.env.PLAID_IDV_TEMPLATE_ID || ""
).trim();

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
  throw new Error(
    "PLAID_IDV_TEMPLATE_ID is missing in .env"
  );
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

/* =========================================================
   ZOHO CONFIGURATION
========================================================= */

const zohoClientId = (
  process.env.ZOHO_CLIENT_ID || ""
).trim();

const zohoClientSecret = (
  process.env.ZOHO_CLIENT_SECRET || ""
).trim();

const zohoRefreshToken = (
  process.env.ZOHO_REFRESH_TOKEN || ""
).trim();

const zohoAccountsUrl = (
  process.env.ZOHO_ACCOUNTS_URL ||
  "https://accounts.zoho.com"
).replace(/\/$/, "");

const zohoApiUrl = (
  process.env.ZOHO_API_URL ||
  "https://www.zohoapis.com"
).replace(/\/$/, "");

const zohoLeadsModule = (
  process.env.ZOHO_LEADS_MODULE || "Leads"
).trim();

const zohoPlaidTokenField = (
  process.env.ZOHO_PLAID_TOKEN_FIELD ||
  "Plaid_Token"
).trim();

const zohoLeadStatusField = (
  process.env.ZOHO_LEAD_STATUS_FIELD ||
  "Lead_Status"
).trim();

const zohoAllowedLeadStatus = (
  process.env.ZOHO_ALLOWED_LEAD_STATUS ||
  "Interested"
).trim();

const zohoTokenStatusField = (
  process.env.ZOHO_TOKEN_STATUS_FIELD ||
  "Plaid_Token_Status"
).trim();

const zohoTokenUsedField = (
  process.env.ZOHO_TOKEN_USED_FIELD ||
  "Plaid_Token_Used_Time"
).trim();

const zohoPlaidStageField = (
  process.env.ZOHO_PLAID_STAGE_FIELD ||
  "Plaid_Stage"
).trim();

/* =========================================================
   TOKEN STATUS VALUES
========================================================= */

const TOKEN_STATUS_ACTIVE = "Active";
const TOKEN_STATUS_USED = "Used";
const TOKEN_STATUS_EXPIRED = "Expired";
const TOKEN_STATUS_REVOKED = "Revoked";

/* =========================================================
   PLAID STAGE VALUES
   ---------------------------------------------------------
   MUHIM: bu qiymatlar Zoho CRM'dagi Plaid_Stage picklist
   variantlari bilan HARFMA-HARF (case-sensitive) bir xil
   bo'lishi SHART. Zoho'da picklistda mos qiymat topilmasa,
   yangilash so'rovi INVALID_DATA xatosi bilan qaytadi.

   Sizning Zoho CRM'ingizdagi picklist variantlari (skrinshot
   asosida):
     Zoho form
     Plaid verification
     Completed

   Agar Zoho'da bu qiymatlarni kelajakda o'zgartirsangiz,
   quyidagi env o'zgaruvchilar orqali moslashtiring:
     ZOHO_STAGE_ZOHO_FORM
     ZOHO_STAGE_VERIFICATION
     ZOHO_STAGE_COMPLETED
========================================================= */

const PLAID_STAGE_ZOHO_FORM = (
  process.env.ZOHO_STAGE_ZOHO_FORM || "Zoho form"
).trim();

const PLAID_STAGE_VERIFICATION = (
  process.env.ZOHO_STAGE_VERIFICATION ||
  "Plaid verification"
).trim();

const PLAID_STAGE_COMPLETED = (
  process.env.ZOHO_STAGE_COMPLETED || "Completed"
).trim();

/* =========================================================
   REQUIRED ENV CHECK
========================================================= */

if (!zohoClientId) {
  throw new Error(
    "ZOHO_CLIENT_ID is missing in .env"
  );
}

if (!zohoClientSecret) {
  throw new Error(
    "ZOHO_CLIENT_SECRET is missing in .env"
  );
}

if (!zohoRefreshToken) {
  throw new Error(
    "ZOHO_REFRESH_TOKEN is missing in .env"
  );
}

/* =========================================================
   ENVIRONMENT LOG
========================================================= */

console.log("========== ENV CHECK ==========");
console.log("PORT:", PORT);
console.log("PLAID_ENV:", plaidEnv);
console.log("PLAID_CLIENT_ID exists:", Boolean(plaidClientId));
console.log("PLAID_SECRET exists:", Boolean(plaidSecret));
console.log("PLAID_IDV_TEMPLATE_ID exists:", Boolean(plaidTemplateId));
console.log("ZOHO_CLIENT_ID exists:", Boolean(zohoClientId));
console.log("ZOHO_CLIENT_SECRET exists:", Boolean(zohoClientSecret));
console.log("ZOHO_REFRESH_TOKEN exists:", Boolean(zohoRefreshToken));
console.log("ZOHO_ACCOUNTS_URL:", zohoAccountsUrl);
console.log("ZOHO_API_URL:", zohoApiUrl);
console.log("ZOHO_LEADS_MODULE:", zohoLeadsModule);
console.log("ZOHO_PLAID_TOKEN_FIELD:", zohoPlaidTokenField);
console.log("ZOHO_LEAD_STATUS_FIELD:", zohoLeadStatusField);
console.log("ZOHO_ALLOWED_LEAD_STATUS:", zohoAllowedLeadStatus);
console.log("ZOHO_TOKEN_STATUS_FIELD:", zohoTokenStatusField);
console.log("ZOHO_TOKEN_USED_FIELD:", zohoTokenUsedField);
console.log("ZOHO_PLAID_STAGE_FIELD:", zohoPlaidStageField);
console.log("PLAID_STAGE_ZOHO_FORM:", JSON.stringify(PLAID_STAGE_ZOHO_FORM));
console.log("PLAID_STAGE_VERIFICATION:", JSON.stringify(PLAID_STAGE_VERIFICATION));
console.log("PLAID_STAGE_COMPLETED:", JSON.stringify(PLAID_STAGE_COMPLETED));
console.log("================================");

/* =========================================================
   ZOHO ACCESS TOKEN CACHE
========================================================= */

let cachedZohoAccessToken = null;
let zohoAccessTokenExpiresAt = 0;

async function getZohoAccessToken() {
  const currentTime = Date.now();

  if (
    cachedZohoAccessToken &&
    currentTime <
      zohoAccessTokenExpiresAt - 5 * 60 * 1000
  ) {
    return cachedZohoAccessToken;
  }

  console.log(
    "\n========== ZOHO ACCESS TOKEN REFRESH =========="
  );

  const response = await axios.post(
    `${zohoAccountsUrl}/oauth/v2/token`,
    new URLSearchParams({
      refresh_token: zohoRefreshToken,
      client_id: zohoClientId,
      client_secret: zohoClientSecret,
      grant_type: "refresh_token",
    }).toString(),
    {
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      timeout: 15000,
      validateStatus: () => true,
    }
  );

  console.log("Zoho OAuth HTTP status:", response.status);

  if (!response.data?.access_token) {
    console.error("Zoho OAuth response:", response.data);

    throw new Error(
      `Zoho access token was not returned: ${JSON.stringify(
        response.data
      )}`
    );
  }

  cachedZohoAccessToken = response.data.access_token;

  const expiresInSeconds = Number(
    response.data.expires_in || 3600
  );

  zohoAccessTokenExpiresAt =
    currentTime + expiresInSeconds * 1000;

  console.log(
    "Zoho access token refreshed successfully, expires in",
    expiresInSeconds,
    "seconds"
  );
  console.log(
    "===============================================\n"
  );

  return cachedZohoAccessToken;
}

/* =========================================================
   TOKEN HELPERS
========================================================= */

function normalizeCrmToken(value) {
  const token = String(value || "").trim().toLowerCase();

  const uuidV4Pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidV4Pattern.test(token)) {
    return null;
  }

  return token;
}

function maskToken(value) {
  const token = String(value || "");

  if (token.length < 12) {
    return "***";
  }

  return `${token.substring(0, 8)}...${token.substring(
    token.length - 4
  )}`;
}

function formatZohoDateTime(date = new Date()) {
  return date.toISOString();
}

/* =========================================================
   UPDATE LEAD IN ZOHO CRM
========================================================= */

async function updateLeadFields(leadId, fields) {
  console.log("\n========== UPDATE ZOHO LEAD ==========");
  console.log("Lead ID:", leadId);
  console.log("Fields:", fields);

  const accessToken = await getZohoAccessToken();

  const response = await axios.put(
    `${zohoApiUrl}/crm/v8/${zohoLeadsModule}`,
    {
      data: [
        {
          id: String(leadId),
          ...fields,
        },
      ],
    },
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
      validateStatus(status) {
        return status >= 200 && status < 500;
      },
    }
  );

  console.log("Zoho update HTTP status:", response.status);
  console.log(
    "Zoho update response:",
    JSON.stringify(response.data, null, 2)
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Zoho Lead update failed: ${JSON.stringify(
        response.data
      )}`
    );
  }

  const result = response.data?.data?.[0];

  if (result && result.status !== "success") {
    throw new Error(
      `Zoho Lead update rejected: ${JSON.stringify(result)}`
    );
  }

  console.log("Zoho Lead updated successfully");
  console.log("======================================\n");

  return response.data;
}

/**
 * Ikkilamchi (bookkeeping) CRM yangilanishlari uchun.
 * Masalan Plaid_Stage'ni "Zoho form" yoki "Plaid verification"
 * ga qo'yish — bu asosiy oqim (token tekshirish, link token
 * yaratish) uchun HAYOTIY EMAS. Shu sababli xato bo'lsa,
 * faqat log qilinadi va foydalanuvchi jarayoni davom etadi.
 *
 * Agar bu chaqiruvlar oddiy updateLeadFields kabi throw qilsa,
 * butun endpoint 500 bilan qaytadi va foydalanuvchi hech qayerga
 * o'tolmay qoladi — aynan shu sabab avvalgi versiyada "/verify"ga
 * o'tish bloklangan edi.
 */
async function updateLeadFieldsBestEffort(
  leadId,
  fields,
  context
) {
  try {
    await updateLeadFields(leadId, fields);
  } catch (error) {
    console.error(
      `Best-effort CRM update failed (${context}) for Lead`,
      leadId,
      ":",
      error.message
    );
  }
}

/* =========================================================
   VALIDATE TOKEN USING COQL
========================================================= */

async function validateLeadToken(rawToken) {
  console.log(
    "\n========== CRM TOKEN VALIDATION START =========="
  );
  console.log("Timestamp:", new Date().toISOString());
  console.log("Raw token received:", maskToken(rawToken));

  const crmToken = normalizeCrmToken(rawToken);

  if (!crmToken) {
    console.log("VALIDATION RESULT: INVALID TOKEN FORMAT");
    console.log(
      "================================================\n"
    );

    return {
      valid: false,
      statusCode: 400,
      message: "Invalid verification token format",
    };
  }

  const accessToken = await getZohoAccessToken();

  const escapedToken = crmToken.replace(/'/g, "\\'");

  const selectQuery = `
    SELECT
      id,
      First_Name,
      Last_Name,
      Email,
      ${zohoPlaidTokenField},
      ${zohoLeadStatusField},
      ${zohoTokenStatusField},
      ${zohoTokenUsedField},
      ${zohoPlaidStageField}
    FROM ${zohoLeadsModule}
    WHERE ${zohoPlaidTokenField} = '${escapedToken}'
    LIMIT 2
  `
    .replace(/\s+/g, " ")
    .trim();

  console.log("Zoho COQL URL:", `${zohoApiUrl}/crm/v8/coql`);
  console.log("Zoho COQL query:", selectQuery);

  const response = await axios.post(
    `${zohoApiUrl}/crm/v8/coql`,
    {
      select_query: selectQuery,
    },
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
      validateStatus(status) {
        return status >= 200 && status < 500;
      },
    }
  );

  console.log("Zoho COQL HTTP status:", response.status);
  console.log(
    "Zoho COQL response:",
    JSON.stringify(response.data, null, 2)
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Zoho COQL failed: ${JSON.stringify(response.data)}`
    );
  }

  const leads = Array.isArray(response.data?.data)
    ? response.data.data
    : [];

  console.log("Matching Lead count:", leads.length);

  if (leads.length === 0) {
    console.log("VALIDATION RESULT: TOKEN NOT FOUND");

    return {
      valid: false,
      statusCode: 403,
      message: "Verification token was not found",
    };
  }

  if (leads.length > 1) {
    console.log("VALIDATION RESULT: DUPLICATE TOKEN");
    console.log(
      "Duplicate Lead IDs:",
      leads.map((lead) => lead.id)
    );

    return {
      valid: false,
      statusCode: 409,
      message: "Duplicate verification token found",
    };
  }

  const lead = leads[0];

  console.log("Matching Lead found");
  console.log("Lead ID:", lead.id);
  console.log(
    "Lead name:",
    `${lead.First_Name || ""} ${lead.Last_Name || ""}`.trim()
  );
  console.log("Lead email:", lead.Email || "");
  console.log(
    "CRM saved token:",
    maskToken(lead[zohoPlaidTokenField])
  );
  console.log("CRM Lead status:", lead[zohoLeadStatusField]);
  console.log(
    "CRM Plaid Token Status:",
    lead[zohoTokenStatusField]
  );
  console.log("CRM Plaid Stage:", lead[zohoPlaidStageField]);

  const savedToken = String(lead[zohoPlaidTokenField] || "")
    .trim()
    .toLowerCase();

  if (savedToken !== crmToken) {
    console.log("VALIDATION RESULT: TOKEN DOES NOT MATCH");

    return {
      valid: false,
      statusCode: 403,
      message: "Verification token is invalid",
    };
  }

  const currentLeadStatus = String(
    lead[zohoLeadStatusField] || ""
  ).trim();

  if (currentLeadStatus !== zohoAllowedLeadStatus) {
    console.log("VALIDATION RESULT: LEAD STATUS NOT ALLOWED");
    console.log("Current status:", currentLeadStatus);
    console.log("Required status:", zohoAllowedLeadStatus);

    return {
      valid: false,
      statusCode: 403,
      message: "This verification link is no longer active",
    };
  }

  const tokenStatus = String(
    lead[zohoTokenStatusField] || ""
  ).trim();

  console.log("Token Status:", tokenStatus || "(empty)");

  if (tokenStatus !== TOKEN_STATUS_ACTIVE) {
    let message = "This verification link is not active";

    if (tokenStatus === TOKEN_STATUS_USED) {
      message = "This verification link has already been used";
    } else if (tokenStatus === TOKEN_STATUS_EXPIRED) {
      message = "This verification link has expired";
    } else if (tokenStatus === TOKEN_STATUS_REVOKED) {
      message = "This verification link has been revoked";
    }

    console.log("VALIDATION RESULT: TOKEN IS NOT ACTIVE");
    console.log("Current token status:", tokenStatus || "(empty)");
    console.log("Validation message:", message);
    console.log(
      "================================================\n"
    );

    return {
      valid: false,
      statusCode: 403,
      message,
    };
  }

  console.log(
    "VALIDATION RESULT: TOKEN EXISTS AND STATUS IS ACTIVE"
  );
  console.log("Lead ID:", lead.id);
  console.log(
    "================================================\n"
  );

  return {
    valid: true,
    crmToken,
    lead,
  };
}

/* =========================================================
   STATIC ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/verify", (req, res) => {
  res.sendFile(path.join(publicPath, "verify.html"));
});

app.get("/complete", (req, res) => {
  res.sendFile(path.join(publicPath, "complete.html"));
});

/* =========================================================
   HEALTH
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    plaid_env: plaidEnv,
    zoho_connected: Boolean(
      zohoClientId && zohoClientSecret && zohoRefreshToken
    ),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   VALIDATE TOKEN / FIRST PAGE OPEN
========================================================= */

app.post("/api/token/validate", async (req, res) => {
  try {
    console.log(
      "\n========== TOKEN VALIDATE REQUEST =========="
    );
    console.log("Timestamp:", new Date().toISOString());

    const { token } = req.body;

    if (!token || String(token).trim() === "") {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "token is required",
      });
    }

    const validation = await validateLeadToken(token);

    if (!validation.valid) {
      return res
        .status(validation.statusCode || 403)
        .json({
          success: false,
          valid: false,
          message: validation.message,
        });
    }

    const { lead } = validation;

    const currentPlaidStage = String(
      lead[zohoPlaidStageField] || ""
    ).trim();

    /*
     * Birinchi ochilganda: Plaid_Stage = "Zoho form"
     * Bu — ikkilamchi bookkeeping, shuning uchun best-effort:
     * muvaffaqiyatsiz bo'lsa ham /api/token/validate javobi
     * "valid: true" bo'lib qolaveradi va foydalanuvchi
     * Zoho formani ko'radi / /verify'ga o'ta oladi.
     */
    if (!currentPlaidStage) {
      console.log("First opening detected");
      console.log("Setting Plaid Stage:", PLAID_STAGE_ZOHO_FORM);

      await updateLeadFieldsBestEffort(
        lead.id,
        { [zohoPlaidStageField]: PLAID_STAGE_ZOHO_FORM },
        "set stage to Zoho form on first open"
      );
    } else {
      console.log(
        "Plaid Stage already exists:",
        currentPlaidStage
      );
    }

    console.log(
      "============================================\n"
    );

    return res.json({
      success: true,
      valid: true,
      message: "Verification token is valid",
      stage: currentPlaidStage || PLAID_STAGE_ZOHO_FORM,
    });
  } catch (error) {
    console.error(
      "\n========== TOKEN VALIDATION ERROR =========="
    );
    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error("Zoho response:", error.response?.data);
    console.error(
      "============================================\n"
    );

    return res.status(500).json({
      success: false,
      valid: false,
      message: "Could not validate verification token",
    });
  }
});

/* =========================================================
   CREATE PLAID LINK TOKEN
========================================================= */

app.post("/api/idv/create_link_token", async (req, res) => {
  try {
    console.log(
      "\n========== CREATE LINK TOKEN REQUEST =========="
    );
    console.log("Timestamp:", new Date().toISOString());

    const { token } = req.body;

    if (!token || String(token).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "token is required",
      });
    }

    console.log("Received token:", maskToken(token));

    const validation = await validateLeadToken(token);

    if (!validation.valid) {
      console.log(
        "Token validation failed:",
        validation.message
      );

      return res
        .status(validation.statusCode || 403)
        .json({
          success: false,
          message: validation.message,
        });
    }

    const { lead } = validation;
    const plaidClientUserId = String(lead.id);

    console.log("Creating Plaid Link Token");
    console.log("client_user_id:", plaidClientUserId);

    const plaidResponse = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: plaidClientUserId,
      },
      client_name: "United Transports",
      products: ["identity_verification"],
      identity_verification: {
        template_id: plaidTemplateId,
      },
      country_codes: ["US"],
      language: "en",
    });

    /*
     * Plaid Link Token muvaffaqiyatli yaratilgandan keyin:
     * Plaid_Stage = "Plaid verification"
     *
     * Best-effort: bu yozuv muvaffaqiyatsiz bo'lsa ham,
     * link_token allaqachon Plaid tomonidan yaratilgan —
     * foydalanuvchi baribir Plaid oynasini ochishi kerak.
     * Avvalgi versiyada bu chaqiruv throw qilib, butun
     * so'rovni 500 bilan qaytargani uchun foydalanuvchi
     * Plaidga umuman o'tolmagan edi.
     */
    await updateLeadFieldsBestEffort(
      lead.id,
      { [zohoPlaidStageField]: PLAID_STAGE_VERIFICATION },
      "set stage to Plaid verification after link token created"
    );

    console.log("Plaid Link Token created successfully");
    console.log("Lead ID:", lead.id);
    console.log(
      "Plaid request ID:",
      plaidResponse.data.request_id
    );
    console.log(
      "================================================\n"
    );

    return res.json({
      success: true,
      link_token: plaidResponse.data.link_token,
      request_id: plaidResponse.data.request_id,
    });
  } catch (error) {
    console.error(
      "\n========== CREATE LINK TOKEN ERROR =========="
    );
    console.error("Timestamp:", new Date().toISOString());
    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error(
      "External response:",
      error.response?.data
    );
    console.error(
      "=============================================\n"
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to validate token or create Plaid link token",
      error:
        process.env.NODE_ENV === "development"
          ? error.response?.data || error.message
          : undefined,
    });
  }
});

/* =========================================================
   COMPLETE PLAID VERIFICATION
========================================================= */

app.post("/api/idv/complete", async (req, res) => {
  try {
    console.log(
      "\n========== IDV COMPLETE REQUEST =========="
    );
    console.log("Timestamp:", new Date().toISOString());

    const { token } = req.body;

    if (!token || String(token).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "token is required",
      });
    }

    console.log("Received token:", maskToken(token));

    /*
     * Completion oldidan token yana tekshiriladi.
     * Faqat Active bo'lsa Completed qilinadi.
     */
    const validation = await validateLeadToken(token);

    if (!validation.valid) {
      return res
        .status(validation.statusCode || 403)
        .json({
          success: false,
          message: validation.message,
        });
    }

    const { lead } = validation;
    const usedTime = formatZohoDateTime();

    console.log("Updating completed status");
    console.log("Lead ID:", lead.id);
    console.log("Plaid Stage:", PLAID_STAGE_COMPLETED);
    console.log("Token Status:", TOKEN_STATUS_USED);
    console.log("Used Time:", usedTime);

    // Bu — endpointning asosiy maqsadi, shuning uchun
    // muvaffaqiyatsizlik bo'lsa xato foydalanuvchiga qaytariladi
    // (verify.js buni catch qilib, xabar ko'rsatadi).
    await updateLeadFields(lead.id, {
      [zohoPlaidStageField]: PLAID_STAGE_COMPLETED,
      [zohoTokenStatusField]: TOKEN_STATUS_USED,
      [zohoTokenUsedField]: usedTime,
    });

    console.log("Lead marked Completed successfully");
    console.log(
      "==========================================\n"
    );

    return res.json({
      success: true,
      message: "Plaid verification completed",
      stage: PLAID_STAGE_COMPLETED,
      token_status: TOKEN_STATUS_USED,
    });
  } catch (error) {
    console.error(
      "\n========== IDV COMPLETE ERROR =========="
    );
    console.error("Timestamp:", new Date().toISOString());
    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error("Response:", error.response?.data);
    console.error(
      "========================================\n"
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update Plaid completion status",
    });
  }
});

/* =========================================================
   GET IDENTITY VERIFICATION RESULT
========================================================= */

app.post("/api/idv/get", async (req, res) => {
  try {
    const { identity_verification_id } = req.body;

    if (
      !identity_verification_id ||
      String(identity_verification_id).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "identity_verification_id is required",
      });
    }

    console.log("\n========== IDV GET REQUEST ==========");
    console.log(
      "Identity Verification ID:",
      identity_verification_id
    );

    const response = await plaidClient.identityVerificationGet(
      {
        identity_verification_id: String(
          identity_verification_id
        ).trim(),
      }
    );

    console.log("Plaid IDV status:", response.data?.status);
    console.log(
      "=====================================\n"
    );

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("\n========== IDV GET ERROR ==========");
    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error("Plaid response:", error.response?.data);
    console.error(
      "===================================\n"
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get identity verification",
      error:
        process.env.NODE_ENV === "development"
          ? error.response?.data || error.message
          : undefined,
    });
  }
});

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});