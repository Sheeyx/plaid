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

const plaidEnv = (process.env.PLAID_ENV || "sandbox").trim();
const plaidClientId = (process.env.PLAID_CLIENT_ID || "").trim();
const plaidSecret = (process.env.PLAID_SECRET || "").trim();
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
  process.env.ZOHO_LEADS_MODULE ||
  "Leads"
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

/*
 * Plaid_Token lifecycle fields (Zoho CRM > Leads):
 *   Plaid_Token_Status       -> Active | Used | Expired | Revoked
 *   Plaid_Token_Created_Time -> datetime, used for auto-expiry
 *   Plaid_Token_Used_Time    -> datetime, set once verification result is obtained
 */

const zohoTokenStatusField = (
  process.env.ZOHO_TOKEN_STATUS_FIELD ||
  "Plaid_Token_Status"
).trim();

const zohoTokenCreatedField = (
  process.env.ZOHO_TOKEN_CREATED_FIELD ||
  "Plaid_Token_Created_Time"
).trim();

const zohoTokenUsedField = (
  process.env.ZOHO_TOKEN_USED_FIELD ||
  "Plaid_Token_Used_Time"
).trim();

const TOKEN_STATUS_ACTIVE = "Active";
const TOKEN_STATUS_USED = "Used";
const TOKEN_STATUS_EXPIRED = "Expired";
const TOKEN_STATUS_REVOKED = "Revoked";

/*
 * Token qancha vaqt "Active" hisoblanadi (soatlarda).
 * Created_Time'dan shu muddat o'tsa, token avtomatik
 * "Expired" deb qabul qilinadi (CRM'da ham shu holatga yangilanadi).
 */
const tokenExpiryHours = Number(
  process.env.TOKEN_EXPIRY_HOURS || 48
);

if (!zohoClientId) {
  throw new Error("ZOHO_CLIENT_ID is missing in .env");
}

if (!zohoClientSecret) {
  throw new Error("ZOHO_CLIENT_SECRET is missing in .env");
}

if (!zohoRefreshToken) {
  throw new Error("ZOHO_REFRESH_TOKEN is missing in .env");
}

/* =========================================================
   ENVIRONMENT CHECK
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
console.log("ZOHO_API_URL:", zohoApiUrl);
console.log("ZOHO_LEADS_MODULE:", zohoLeadsModule);
console.log("ZOHO_PLAID_TOKEN_FIELD:", zohoPlaidTokenField);
console.log("ZOHO_LEAD_STATUS_FIELD:", zohoLeadStatusField);
console.log("ZOHO_ALLOWED_LEAD_STATUS:", zohoAllowedLeadStatus);
console.log("ZOHO_TOKEN_STATUS_FIELD:", zohoTokenStatusField);
console.log("ZOHO_TOKEN_CREATED_FIELD:", zohoTokenCreatedField);
console.log("ZOHO_TOKEN_USED_FIELD:", zohoTokenUsedField);
console.log("TOKEN_EXPIRY_HOURS:", tokenExpiryHours);
console.log("================================");

/* =========================================================
   ZOHO ACCESS TOKEN CACHE
========================================================= */

let cachedZohoAccessToken = null;
let zohoAccessTokenExpiresAt = 0;

/**
 * Zoho refresh token orqali access token oladi.
 */
async function getZohoAccessToken() {
  const currentTime = Date.now();

  // Token hali ishlayotgan bo'lsa, cached tokenni qaytaramiz.
  // Tugashidan 5 daqiqa oldin yangilanadi.
  if (
    cachedZohoAccessToken &&
    currentTime < zohoAccessTokenExpiresAt - 5 * 60 * 1000
  ) {
    return cachedZohoAccessToken;
  }

  console.log("Refreshing Zoho access token...");

  const response = await axios.post(
    `${zohoAccountsUrl}/oauth/v2/token`,
    null,
    {
      params: {
        refresh_token: zohoRefreshToken,
        client_id: zohoClientId,
        client_secret: zohoClientSecret,
        grant_type: "refresh_token",
      },
      timeout: 15000,
    }
  );

  const accessToken = response.data?.access_token;

  if (!accessToken) {
    throw new Error(
      `Zoho access token was not returned: ${JSON.stringify(
        response.data
      )}`
    );
  }

  const expiresInSeconds = Number(
    response.data?.expires_in || 3600
  );

  cachedZohoAccessToken = accessToken;
  zohoAccessTokenExpiresAt =
    currentTime + expiresInSeconds * 1000;

  console.log("Zoho access token refreshed successfully");

  return accessToken;
}

/* =========================================================
   TOKEN HELPERS
========================================================= */

/**
 * Token formatini tekshiradi.
 *
 * Kutilayotgan format:
 * xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx
 */
function normalizeCrmToken(value) {
  const token = String(value || "").trim().toLowerCase();

  const uuidV4Pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidV4Pattern.test(token)) {
    return null;
  }

  return token;
}

/**
 * Loglarda to'liq tokenni ko'rsatmaydi.
 */
function maskToken(value) {
  const token = String(value || "");

  if (token.length < 12) {
    return "***";
  }

  return `${token.substring(0, 8)}...${token.substring(
    token.length - 4
  )}`;
}

/* =========================================================
   UPDATE LEAD FIELDS IN ZOHO CRM
========================================================= */

/**
 * Berilgan Lead ID uchun bir yoki bir nechta fieldni yangilaydi.
 * Best-effort operatsiya sifatida ishlatiladi — chaqiruvchi kod
 * xatolikni ushlab, asosiy javobni bloklamasligi kerak.
 */
async function updateLeadFields(leadId, fields) {
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

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Zoho Lead update failed: ${JSON.stringify(response.data)}`
    );
  }

  const result = response.data?.data?.[0];

  if (result && result.status !== "success") {
    throw new Error(
      `Zoho Lead update rejected: ${JSON.stringify(result)}`
    );
  }

  return response.data;
}

/* =========================================================
   VALIDATE TOKEN IN ZOHO CRM (via Search API)
========================================================= */

/**
 * Plaid_Token field orqali Leadni Zoho CRM'dan /search endpoint
 * orqali qidiradi va Plaid_Token_Status asosida tekshiradi.
 *
 * MUHIM: Bu endpoint ishlashi uchun Zoho CRM'da
 * (Setup > Customization > Modules and Fields > Leads > Plaid_Token)
 * field aynan "searchable" deb belgilangan bo'lishi SHART.
 * Aks holda "INVALID_QUERY: the field is not available for search"
 * xatosi chiqadi.
 */
async function validateLeadToken(rawToken) {
  console.log("\n========== CRM TOKEN VALIDATION START ==========");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Raw token received:", maskToken(rawToken));

  const crmToken = normalizeCrmToken(rawToken);

  if (!crmToken) {
    console.log("VALIDATION RESULT: INVALID TOKEN FORMAT");
    console.log("================================================\n");

    return {
      valid: false,
      statusCode: 400,
      message: "Invalid verification token format",
    };
  }

  console.log("Normalized token:", maskToken(crmToken));
  console.log("Zoho module:", zohoLeadsModule);
  console.log("Zoho token field:", zohoPlaidTokenField);
  console.log("Zoho status field:", zohoLeadStatusField);

  const accessToken = await getZohoAccessToken();

  console.log("Zoho access token received:", Boolean(accessToken));

  /*
   * Token faqat UUID belgilaridan iborat bo‘lsa ham,
   * SQL/COQL string ichiga qo‘yishdan oldin escape qilamiz.
   */
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
      ${zohoTokenCreatedField},
      ${zohoTokenUsedField}
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
    console.log("VALIDATION RESULT: ZOHO QUERY FAILED");
    console.log("================================================\n");

    throw new Error(
      `Zoho COQL failed: ${JSON.stringify(response.data)}`
    );
  }

  const leads = Array.isArray(response.data?.data)
    ? response.data.data
    : [];

  console.log("Matching Lead count:", leads.length);

  if (leads.length === 0) {
    console.log("VALIDATION RESULT: TOKEN NOT FOUND IN CRM");
    console.log("================================================\n");

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
    console.log("================================================\n");

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
  console.log(
    "CRM Lead status:",
    lead[zohoLeadStatusField]
  );
  console.log(
    "CRM Plaid token status:",
    lead[zohoTokenStatusField]
  );
  console.log(
    "CRM Plaid token created time:",
    lead[zohoTokenCreatedField]
  );
  console.log(
    "CRM Plaid token used time:",
    lead[zohoTokenUsedField]
  );

  const savedToken = String(
    lead[zohoPlaidTokenField] || ""
  )
    .trim()
    .toLowerCase();

  if (savedToken !== crmToken) {
    console.log("VALIDATION RESULT: TOKEN DOES NOT MATCH");
    console.log("Received token:", maskToken(crmToken));
    console.log("CRM token:", maskToken(savedToken));
    console.log("================================================\n");

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
    console.log("================================================\n");

    return {
      valid: false,
      statusCode: 403,
      message: "This verification link is no longer active",
    };
  }

  /* -----------------------------------------------------
     PLAID_TOKEN_STATUS CHECK (Active / Used / Expired / Revoked)
  ----------------------------------------------------- */

  const tokenStatus = String(
    lead[zohoTokenStatusField] || ""
  ).trim();

  if (tokenStatus === TOKEN_STATUS_USED) {
    console.log("VALIDATION RESULT: TOKEN ALREADY USED");
    console.log("================================================\n");

    return {
      valid: false,
      statusCode: 403,
      message: "This verification link has already been used",
    };
  }

  if (tokenStatus === TOKEN_STATUS_REVOKED) {
    console.log("VALIDATION RESULT: TOKEN REVOKED");
    console.log("================================================\n");

    return {
      valid: false,
      statusCode: 403,
      message: "This verification link has been revoked",
    };
  }

  if (tokenStatus === TOKEN_STATUS_EXPIRED) {
    console.log("VALIDATION RESULT: TOKEN ALREADY MARKED EXPIRED");
    console.log("================================================\n");

    return {
      valid: false,
      statusCode: 403,
      message: "This verification link has expired",
    };
  }

  if (tokenStatus !== TOKEN_STATUS_ACTIVE) {
    console.log("VALIDATION RESULT: UNKNOWN/UNSET TOKEN STATUS");
    console.log("Token status value:", tokenStatus || "(empty)");
    console.log("================================================\n");

    return {
      valid: false,
      statusCode: 403,
      message: "This verification link is not active",
    };
  }

  /* -----------------------------------------------------
     AUTO-EXPIRY CHECK (Created_Time + TOKEN_EXPIRY_HOURS)
  ----------------------------------------------------- */

  const createdRaw = lead[zohoTokenCreatedField];

  if (createdRaw) {
    const createdTimeMs = new Date(createdRaw).getTime();

    if (!Number.isNaN(createdTimeMs)) {
      const hoursElapsed =
        (Date.now() - createdTimeMs) / (1000 * 60 * 60);

      console.log(
        "Hours elapsed since token creation:",
        hoursElapsed.toFixed(2)
      );
      console.log("Token expiry limit (hours):", tokenExpiryHours);

      if (hoursElapsed > tokenExpiryHours) {
        console.log("VALIDATION RESULT: TOKEN EXPIRED BY TIME");
        console.log("================================================\n");

        // Best-effort: CRM'da holatni "Expired" ga yangilaymiz.
        // Bu asosiy javobni bloklamaydi — xatolik faqat log qilinadi.
        updateLeadFields(lead.id, {
          [zohoTokenStatusField]: TOKEN_STATUS_EXPIRED,
        }).catch((err) => {
          console.error(
            "Failed to mark token Expired in CRM:",
            err.message
          );
        });

        return {
          valid: false,
          statusCode: 403,
          message: "This verification link has expired",
        };
      }
    } else {
      console.log(
        "WARNING: Could not parse token created time:",
        createdRaw
      );
    }
  } else {
    console.log(
      "WARNING: Token created time is empty — skipping auto-expiry check"
    );
  }

  console.log("VALIDATION RESULT: TOKEN EXISTS AND IS VALID");
  console.log("Lead ID:", lead.id);
  console.log("Lead status:", currentLeadStatus);
  console.log("Plaid token status:", tokenStatus);
  console.log("================================================\n");

  return {
    valid: true,
    crmToken,
    lead,
  };
}
/* =========================================================
   STATIC PAGE ROUTES
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
   HEALTH CHECK
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    plaid_env: plaidEnv,
    zoho_connected: Boolean(
      zohoClientId &&
      zohoClientSecret &&
      zohoRefreshToken
    ),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   VALIDATE TOKEN ENDPOINT
========================================================= */

/**
 * Bu endpoint index.html ochilganda tokenni oldindan
 * tekshirish uchun ham ishlatilishi mumkin.
 */
app.post("/api/token/validate", async (req, res) => {
  try {
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

    return res.json({
      success: true,
      valid: true,
      message: "Verification token is valid",
    });
  } catch (error) {
    console.error("TOKEN VALIDATION ERROR:");
    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error("Zoho response:", error.response?.data);

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

/**
 * 1. Browserdan CRM token keladi.
 * 2. Token Zoho CRM ichida tekshiriladi (status, expiry va h.k.).
 * 3. Lead topilsa va barcha shartlar bajarilsa,
 *    Plaid Link Token yaratiladi.
 *
 * MUHIM: Bu bosqichda Plaid_Token_Status "Used" ga
 * O'ZGARTIRILMAYDI — chunki foydalanuvchi hali Plaid
 * verificationni tugatmagan bo'lishi mumkin (masalan sahifani
 * yopib qo'yishi mumkin). Status faqat natija olinganda
 * (/api/idv/get orqali) "Used" ga o'zgaradi.
 */
app.post(
  "/api/idv/create_link_token",
  async (req, res) => {
    try {
      console.log("\n==== CREATE LINK TOKEN REQUEST ====");
      console.log("Timestamp:", new Date().toISOString());

      const { token } = req.body;

      if (!token || String(token).trim() === "") {
        console.warn("Token is missing");

        return res.status(400).json({
          success: false,
          message: "token is required",
        });
      }

      console.log(
        "Received CRM token:",
        maskToken(token)
      );

      // CRM ichida tokenni tekshirish
      const validation = await validateLeadToken(token);

      if (!validation.valid) {
        console.warn(
          "CRM token validation failed:",
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

      /*
       * Plaid client_user_id sifatida token emas,
       * Zoho Lead ID yuboriladi.
       *
       * Bu Plaid verificationni aniq Zoho Lead bilan
       * bog'lash imkonini beradi — /api/idv/get chaqirilganda
       * shu client_user_id orqali qaysi Leadni "Used" qilishni
       * bilib olamiz.
       */
      const plaidClientUserId = String(lead.id);

      console.log("Creating Plaid Link Token...");
      console.log(
        "Plaid client_user_id:",
        plaidClientUserId
      );

      const plaidResponse =
        await plaidClient.linkTokenCreate({
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

      console.log(
        "Plaid Link Token created successfully"
      );
      console.log("Zoho Lead ID:", lead.id);
      console.log(
        "Plaid request ID:",
        plaidResponse.data.request_id
      );
      console.log("===================================\n");

      return res.json({
        success: true,
        link_token: plaidResponse.data.link_token,
        request_id: plaidResponse.data.request_id,
      });
    } catch (error) {
      console.error("\n==== CREATE LINK TOKEN ERROR ====");
      console.error("Timestamp:", new Date().toISOString());
      console.error("Message:", error.message);
      console.error("Status:", error.response?.status);
      console.error(
        "External response:",
        error.response?.data
      );
      console.error("=================================\n");

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
  }
);

/* =========================================================
   GET IDENTITY VERIFICATION RESULT
========================================================= */

/**
 * Plaid identity_verification natijasini oladi.
 *
 * Natija "terminal" holatga yetganda (ya'ni "active"
 * bosqichidan chiqqanda — success, failed, expired, canceled,
 * pending_review va h.k.), tegishli Zoho Lead'ning
 * Plaid_Token_Status maydoni "Used" ga, Plaid_Token_Used_Time
 * esa joriy vaqtga o'zgartiriladi.
 *
 * Bu — CRM yangilanishi muvaffaqiyatsiz bo'lsa ham, foydalanuvchiga
 * IDV natijasi baribir qaytariladigan best-effort operatsiya.
 */
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

    console.log("\n==== IDV GET REQUEST ====");
    console.log("Timestamp:", new Date().toISOString());
    console.log(
      "Identity Verification ID:",
      identity_verification_id
    );

    const response =
      await plaidClient.identityVerificationGet({
        identity_verification_id: String(
          identity_verification_id
        ).trim(),
      });

    const idvStatus = response.data?.status;
    const leadId = response.data?.client_user_id;

    console.log("IDV result received successfully");
    console.log("Status:", idvStatus || "Unknown");
    console.log("client_user_id (Zoho Lead ID):", leadId || "(none)");

    // "active" — verification hali davom etmoqda, natija yakuniy emas.
    const isTerminal = Boolean(idvStatus) && idvStatus !== "active";

    if (isTerminal && leadId) {
      try {
        await updateLeadFields(leadId, {
          [zohoTokenStatusField]: TOKEN_STATUS_USED,
          [zohoTokenUsedField]: new Date().toISOString(),
        });

        console.log(
          "Plaid_Token_Status set to 'Used' for Lead:",
          leadId
        );
      } catch (updateError) {
        // CRM yangilanishi muvaffaqiyatsiz bo'lsa ham, IDV natijasini
        // foydalanuvchiga qaytarishda davom etamiz.
        console.error(
          "Failed to mark token Used in CRM for Lead",
          leadId,
          ":",
          updateError.message
        );
      }
    } else if (isTerminal && !leadId) {
      console.warn(
        "IDV terminal but no client_user_id present — cannot update token status"
      );
    }

    console.log("=========================\n");

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("\n==== IDV GET ERROR ====");
    console.error("Timestamp:", new Date().toISOString());
    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error(
      "Plaid response:",
      error.response?.data
    );
    console.error("=======================\n");

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
   404 HANDLER
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