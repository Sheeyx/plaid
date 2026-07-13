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

const zohoTokenCreatedField = (
  process.env.ZOHO_TOKEN_CREATED_FIELD ||
  "Plaid_Token_Created_Time"
).trim();

const zohoTokenExpiryField = (
  process.env.ZOHO_TOKEN_EXPIRY_FIELD ||
  "Plaid_Token_Expiry_Time"
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
========================================================= */

const PLAID_STAGE_ZOHO_FORM = "Zoho Form";
const PLAID_STAGE_VERIFICATION =
  "Plaid Verification";
const PLAID_STAGE_COMPLETED = "Completed";

/*
 * Expiry field bo‘sh bo‘lsa Created Time orqali
 * ushbu soat miqdori bilan tekshiriladi.
 *
 * 72 hours = 3 days
 */
const tokenExpiryHours = Number(
  process.env.TOKEN_EXPIRY_HOURS || 72
);

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
console.log(
  "PLAID_CLIENT_ID exists:",
  Boolean(plaidClientId)
);
console.log(
  "PLAID_SECRET exists:",
  Boolean(plaidSecret)
);
console.log(
  "PLAID_IDV_TEMPLATE_ID exists:",
  Boolean(plaidTemplateId)
);
console.log(
  "ZOHO_CLIENT_ID exists:",
  Boolean(zohoClientId)
);
console.log(
  "ZOHO_CLIENT_SECRET exists:",
  Boolean(zohoClientSecret)
);
console.log(
  "ZOHO_REFRESH_TOKEN exists:",
  Boolean(zohoRefreshToken)
);
console.log("ZOHO_ACCOUNTS_URL:", zohoAccountsUrl);
console.log("ZOHO_API_URL:", zohoApiUrl);
console.log("ZOHO_LEADS_MODULE:", zohoLeadsModule);
console.log(
  "ZOHO_PLAID_TOKEN_FIELD:",
  zohoPlaidTokenField
);
console.log(
  "ZOHO_LEAD_STATUS_FIELD:",
  zohoLeadStatusField
);
console.log(
  "ZOHO_ALLOWED_LEAD_STATUS:",
  zohoAllowedLeadStatus
);
console.log(
  "ZOHO_TOKEN_STATUS_FIELD:",
  zohoTokenStatusField
);
console.log(
  "ZOHO_TOKEN_CREATED_FIELD:",
  zohoTokenCreatedField
);
console.log(
  "ZOHO_TOKEN_EXPIRY_FIELD:",
  zohoTokenExpiryField
);
console.log(
  "ZOHO_TOKEN_USED_FIELD:",
  zohoTokenUsedField
);
console.log(
  "ZOHO_PLAID_STAGE_FIELD:",
  zohoPlaidStageField
);
console.log(
  "TOKEN_EXPIRY_HOURS:",
  tokenExpiryHours
);
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
      zohoAccessTokenExpiresAt -
        5 * 60 * 1000
  ) {
    console.log(
      "Using cached Zoho access token"
    );

    return cachedZohoAccessToken;
  }

  console.log(
    "\n========== ZOHO ACCESS TOKEN REFRESH =========="
  );
  console.log("Accounts URL:", zohoAccountsUrl);
  console.log(
    "Client ID exists:",
    Boolean(zohoClientId)
  );
  console.log(
    "Client Secret exists:",
    Boolean(zohoClientSecret)
  );
  console.log(
    "Refresh Token exists:",
    Boolean(zohoRefreshToken)
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

  console.log(
    "Zoho OAuth HTTP status:",
    response.status
  );

  if (!response.data?.access_token) {
    console.error(
      "Zoho OAuth response:",
      response.data
    );

    throw new Error(
      `Zoho access token was not returned: ${JSON.stringify(
        response.data
      )}`
    );
  }

  cachedZohoAccessToken =
    response.data.access_token;

  const expiresInSeconds = Number(
    response.data.expires_in || 3600
  );

  zohoAccessTokenExpiresAt =
    currentTime + expiresInSeconds * 1000;

  console.log(
    "Zoho access token refreshed successfully"
  );
  console.log(
    "Expires in:",
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
  const token = String(value || "")
    .trim()
    .toLowerCase();

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

  return `${token.substring(
    0,
    8
  )}...${token.substring(token.length - 4)}`;
}

function formatZohoDateTime(date = new Date()) {
  return date.toISOString();
}

/* =========================================================
   UPDATE LEAD IN ZOHO CRM
========================================================= */

async function updateLeadFields(
  leadId,
  fields
) {
  console.log(
    "\n========== UPDATE ZOHO LEAD =========="
  );
  console.log("Lead ID:", leadId);
  console.log("Fields:", fields);

  const accessToken =
    await getZohoAccessToken();

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
        Authorization:
          `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
      validateStatus(status) {
        return status >= 200 && status < 500;
      },
    }
  );

  console.log(
    "Zoho update HTTP status:",
    response.status
  );
  console.log(
    "Zoho update response:",
    JSON.stringify(response.data, null, 2)
  );

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw new Error(
      `Zoho Lead update failed: ${JSON.stringify(
        response.data
      )}`
    );
  }

  const result =
    response.data?.data?.[0];

  if (
    result &&
    result.status !== "success"
  ) {
    throw new Error(
      `Zoho Lead update rejected: ${JSON.stringify(
        result
      )}`
    );
  }

  console.log(
    "Zoho Lead updated successfully"
  );
  console.log(
    "======================================\n"
  );

  return response.data;
}

/* =========================================================
   VALIDATE TOKEN USING COQL
========================================================= */

async function validateLeadToken(rawToken) {
  console.log(
    "\n========== CRM TOKEN VALIDATION START =========="
  );
  console.log(
    "Timestamp:",
    new Date().toISOString()
  );
  console.log(
    "Raw token received:",
    maskToken(rawToken)
  );

  const crmToken =
    normalizeCrmToken(rawToken);

  if (!crmToken) {
    console.log(
      "VALIDATION RESULT: INVALID TOKEN FORMAT"
    );
    console.log(
      "================================================\n"
    );

    return {
      valid: false,
      statusCode: 400,
      message:
        "Invalid verification token format",
    };
  }

  const accessToken =
    await getZohoAccessToken();

  const escapedToken =
    crmToken.replace(/'/g, "\\'");

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
      ${zohoTokenExpiryField},
      ${zohoTokenUsedField},
      ${zohoPlaidStageField}
    FROM ${zohoLeadsModule}
    WHERE ${zohoPlaidTokenField} = '${escapedToken}'
    LIMIT 2
  `
    .replace(/\s+/g, " ")
    .trim();

  console.log(
    "Zoho COQL URL:",
    `${zohoApiUrl}/crm/v8/coql`
  );
  console.log(
    "Zoho COQL query:",
    selectQuery
  );

  const response = await axios.post(
    `${zohoApiUrl}/crm/v8/coql`,
    {
      select_query: selectQuery,
    },
    {
      headers: {
        Authorization:
          `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
      validateStatus(status) {
        return status >= 200 && status < 500;
      },
    }
  );

  console.log(
    "Zoho COQL HTTP status:",
    response.status
  );
  console.log(
    "Zoho COQL response:",
    JSON.stringify(response.data, null, 2)
  );

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw new Error(
      `Zoho COQL failed: ${JSON.stringify(
        response.data
      )}`
    );
  }

  const leads = Array.isArray(
    response.data?.data
  )
    ? response.data.data
    : [];

  console.log(
    "Matching Lead count:",
    leads.length
  );

  if (leads.length === 0) {
    console.log(
      "VALIDATION RESULT: TOKEN NOT FOUND"
    );

    return {
      valid: false,
      statusCode: 403,
      message:
        "Verification token was not found",
    };
  }

  if (leads.length > 1) {
    console.log(
      "VALIDATION RESULT: DUPLICATE TOKEN"
    );

    return {
      valid: false,
      statusCode: 409,
      message:
        "Duplicate verification token found",
    };
  }

  const lead = leads[0];

  console.log("Lead ID:", lead.id);
  console.log(
    "Lead name:",
    `${lead.First_Name || ""} ${
      lead.Last_Name || ""
    }`.trim()
  );
  console.log(
    "CRM saved token:",
    maskToken(
      lead[zohoPlaidTokenField]
    )
  );
  console.log(
    "CRM Lead status:",
    lead[zohoLeadStatusField]
  );
  console.log(
    "CRM token status:",
    lead[zohoTokenStatusField]
  );
  console.log(
    "CRM Plaid stage:",
    lead[zohoPlaidStageField]
  );
  console.log(
    "CRM created time:",
    lead[zohoTokenCreatedField]
  );
  console.log(
    "CRM expiry time:",
    lead[zohoTokenExpiryField]
  );

  const savedToken = String(
    lead[zohoPlaidTokenField] || ""
  )
    .trim()
    .toLowerCase();

  if (savedToken !== crmToken) {
    return {
      valid: false,
      statusCode: 403,
      message:
        "Verification token is invalid",
    };
  }

  const currentLeadStatus = String(
    lead[zohoLeadStatusField] || ""
  ).trim();

  if (
    currentLeadStatus !==
    zohoAllowedLeadStatus
  ) {
    console.log(
      "VALIDATION RESULT: LEAD STATUS NOT ALLOWED"
    );
    console.log(
      "Current:",
      currentLeadStatus
    );
    console.log(
      "Required:",
      zohoAllowedLeadStatus
    );

    return {
      valid: false,
      statusCode: 403,
      message:
        "This verification link is no longer active",
    };
  }

  const tokenStatus = String(
    lead[zohoTokenStatusField] || ""
  ).trim();

  if (
    tokenStatus === TOKEN_STATUS_USED
  ) {
    return {
      valid: false,
      statusCode: 403,
      message:
        "This verification link has already been used",
    };
  }

  if (
    tokenStatus === TOKEN_STATUS_REVOKED
  ) {
    return {
      valid: false,
      statusCode: 403,
      message:
        "This verification link has been revoked",
    };
  }

  if (
    tokenStatus === TOKEN_STATUS_EXPIRED
  ) {
    return {
      valid: false,
      statusCode: 403,
      message:
        "This verification link has expired",
    };
  }

  if (
    tokenStatus !== TOKEN_STATUS_ACTIVE
  ) {
    return {
      valid: false,
      statusCode: 403,
      message:
        "This verification link is not active",
    };
  }

  /*
   * First check exact expiry field.
   */
  const expiryRaw =
    lead[zohoTokenExpiryField];

  if (expiryRaw) {
    const expiryTime =
      new Date(expiryRaw).getTime();

    console.log(
      "Parsed expiry time:",
      expiryTime
    );
    console.log(
      "Current timestamp:",
      Date.now()
    );

    if (
      !Number.isNaN(expiryTime) &&
      Date.now() >= expiryTime
    ) {
      console.log(
        "VALIDATION RESULT: TOKEN EXPIRED BY EXPIRY FIELD"
      );

      try {
        await updateLeadFields(
          lead.id,
          {
            [zohoTokenStatusField]:
              TOKEN_STATUS_EXPIRED,
          }
        );
      } catch (error) {
        console.error(
          "Could not set token Expired:",
          error.message
        );
      }

      return {
        valid: false,
        statusCode: 403,
        message:
          "This verification link has expired",
      };
    }
  } else {
    /*
     * Fallback: Created_Time + hours.
     */
    const createdRaw =
      lead[zohoTokenCreatedField];

    if (createdRaw) {
      const createdTime =
        new Date(createdRaw).getTime();

      if (!Number.isNaN(createdTime)) {
        const hoursElapsed =
          (Date.now() - createdTime) /
          (1000 * 60 * 60);

        console.log(
          "Hours elapsed:",
          hoursElapsed.toFixed(2)
        );

        if (
          hoursElapsed >=
          tokenExpiryHours
        ) {
          try {
            await updateLeadFields(
              lead.id,
              {
                [zohoTokenStatusField]:
                  TOKEN_STATUS_EXPIRED,
              }
            );
          } catch (error) {
            console.error(
              "Could not set token Expired:",
              error.message
            );
          }

          return {
            valid: false,
            statusCode: 403,
            message:
              "This verification link has expired",
          };
        }
      }
    }
  }

  console.log(
    "VALIDATION RESULT: TOKEN EXISTS AND IS VALID"
  );
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
  res.sendFile(
    path.join(publicPath, "index.html")
  );
});

app.get("/verify", (req, res) => {
  res.sendFile(
    path.join(publicPath, "verify.html")
  );
});

app.get("/complete", (req, res) => {
  res.sendFile(
    path.join(publicPath, "complete.html")
  );
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
      zohoClientId &&
        zohoClientSecret &&
        zohoRefreshToken
    ),
    timestamp:
      new Date().toISOString(),
  });
});

/* =========================================================
   VALIDATE TOKEN / FIRST PAGE OPEN
========================================================= */

app.post(
  "/api/token/validate",
  async (req, res) => {
    try {
      console.log(
        "\n========== TOKEN VALIDATE REQUEST =========="
      );
      console.log(
        "Timestamp:",
        new Date().toISOString()
      );

      const { token } = req.body;

      if (
        !token ||
        String(token).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: "token is required",
        });
      }

      const validation =
        await validateLeadToken(token);

      if (!validation.valid) {
        return res
          .status(
            validation.statusCode || 403
          )
          .json({
            success: false,
            valid: false,
            message:
              validation.message,
          });
      }

      const { lead } = validation;

      const currentPlaidStage =
        String(
          lead[zohoPlaidStageField] || ""
        ).trim();

      /*
       * Faqat birinchi ochilganda Zoho Form.
       *
       * Plaid Verification yoki Completed bo‘lsa
       * orqaga Zoho Form holatiga tushirmaydi.
       */
      if (!currentPlaidStage) {
        console.log(
          "First opening detected"
        );
        console.log(
          "Setting Plaid Stage:",
          PLAID_STAGE_ZOHO_FORM
        );

        await updateLeadFields(
          lead.id,
          {
            [zohoPlaidStageField]:
              PLAID_STAGE_ZOHO_FORM,
          }
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
        message:
          "Verification token is valid",
        stage:
          currentPlaidStage ||
          PLAID_STAGE_ZOHO_FORM,
      });
    } catch (error) {
      console.error(
        "\n========== TOKEN VALIDATION ERROR =========="
      );
      console.error(
        "Message:",
        error.message
      );
      console.error(
        "Status:",
        error.response?.status
      );
      console.error(
        "Zoho response:",
        error.response?.data
      );
      console.error(
        "============================================\n"
      );

      return res.status(500).json({
        success: false,
        valid: false,
        message:
          "Could not validate verification token",
      });
    }
  }
);

/* =========================================================
   CREATE PLAID LINK TOKEN
========================================================= */

app.post(
  "/api/idv/create_link_token",
  async (req, res) => {
    try {
      console.log(
        "\n========== CREATE LINK TOKEN REQUEST =========="
      );
      console.log(
        "Timestamp:",
        new Date().toISOString()
      );

      const { token } = req.body;

      if (
        !token ||
        String(token).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message: "token is required",
        });
      }

      console.log(
        "Received token:",
        maskToken(token)
      );

      const validation =
        await validateLeadToken(token);

      if (!validation.valid) {
        console.log(
          "Token validation failed:",
          validation.message
        );

        return res
          .status(
            validation.statusCode || 403
          )
          .json({
            success: false,
            message:
              validation.message,
          });
      }

      const { lead } = validation;

      const plaidClientUserId =
        String(lead.id);

      console.log(
        "Creating Plaid Link Token"
      );
      console.log(
        "client_user_id:",
        plaidClientUserId
      );

      const plaidResponse =
        await plaidClient.linkTokenCreate(
          {
            user: {
              client_user_id:
                plaidClientUserId,
            },
            client_name:
              "United Transports",
            products: [
              "identity_verification",
            ],
            identity_verification: {
              template_id:
                plaidTemplateId,
            },
            country_codes: ["US"],
            language: "en",
          }
        );

      /*
       * Plaid link token muvaffaqiyatli
       * yaratilgandan keyin stage yangilanadi.
       */
      await updateLeadFields(
        lead.id,
        {
          [zohoPlaidStageField]:
            PLAID_STAGE_VERIFICATION,
        }
      );

      console.log(
        "Plaid Link Token created successfully"
      );
      console.log(
        "Plaid Stage:",
        PLAID_STAGE_VERIFICATION
      );
      console.log(
        "Lead ID:",
        lead.id
      );
      console.log(
        "Plaid request ID:",
        plaidResponse.data.request_id
      );
      console.log(
        "================================================\n"
      );

      return res.json({
        success: true,
        link_token:
          plaidResponse.data.link_token,
        request_id:
          plaidResponse.data.request_id,
      });
    } catch (error) {
      console.error(
        "\n========== CREATE LINK TOKEN ERROR =========="
      );
      console.error(
        "Timestamp:",
        new Date().toISOString()
      );
      console.error(
        "Message:",
        error.message
      );
      console.error(
        "Status:",
        error.response?.status
      );
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
          process.env.NODE_ENV ===
          "development"
            ? error.response?.data ||
              error.message
            : undefined,
      });
    }
  }
);

/* =========================================================
   COMPLETE PLAID VERIFICATION
========================================================= */

app.post(
  "/api/idv/complete",
  async (req, res) => {
    try {
      console.log(
        "\n========== IDV COMPLETE REQUEST =========="
      );
      console.log(
        "Timestamp:",
        new Date().toISOString()
      );

      const { token } = req.body;

      if (
        !token ||
        String(token).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message: "token is required",
        });
      }

      console.log(
        "Received token:",
        maskToken(token)
      );

      /*
       * Completion oldidan token yana CRM’da
       * tekshiriladi.
       */
      const validation =
        await validateLeadToken(token);

      if (!validation.valid) {
        return res
          .status(
            validation.statusCode || 403
          )
          .json({
            success: false,
            message:
              validation.message,
          });
      }

      const { lead } = validation;

      const usedTime =
        formatZohoDateTime();

      console.log(
        "Updating completed status"
      );
      console.log(
        "Lead ID:",
        lead.id
      );
      console.log(
        "Plaid Stage:",
        PLAID_STAGE_COMPLETED
      );
      console.log(
        "Token Status:",
        TOKEN_STATUS_USED
      );
      console.log(
        "Used Time:",
        usedTime
      );

      await updateLeadFields(
        lead.id,
        {
          [zohoPlaidStageField]:
            PLAID_STAGE_COMPLETED,
          [zohoTokenStatusField]:
            TOKEN_STATUS_USED,
          [zohoTokenUsedField]:
            usedTime,
        }
      );

      console.log(
        "Lead marked Completed successfully"
      );
      console.log(
        "==========================================\n"
      );

      return res.json({
        success: true,
        message:
          "Plaid verification completed",
        stage:
          PLAID_STAGE_COMPLETED,
        token_status:
          TOKEN_STATUS_USED,
      });
    } catch (error) {
      console.error(
        "\n========== IDV COMPLETE ERROR =========="
      );
      console.error(
        "Timestamp:",
        new Date().toISOString()
      );
      console.error(
        "Message:",
        error.message
      );
      console.error(
        "Status:",
        error.response?.status
      );
      console.error(
        "Response:",
        error.response?.data
      );
      console.error(
        "========================================\n"
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update Plaid completion status",
      });
    }
  }
);

/* =========================================================
   GET IDENTITY VERIFICATION RESULT
========================================================= */

app.post(
  "/api/idv/get",
  async (req, res) => {
    try {
      const {
        identity_verification_id,
      } = req.body;

      if (
        !identity_verification_id ||
        String(
          identity_verification_id
        ).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "identity_verification_id is required",
        });
      }

      console.log(
        "\n========== IDV GET REQUEST =========="
      );
      console.log(
        "Identity Verification ID:",
        identity_verification_id
      );

      const response =
        await plaidClient.identityVerificationGet(
          {
            identity_verification_id:
              String(
                identity_verification_id
              ).trim(),
          }
        );

      console.log(
        "Plaid IDV status:",
        response.data?.status
      );
      console.log(
        "=====================================\n"
      );

      return res.json({
        success: true,
        data: response.data,
      });
    } catch (error) {
      console.error(
        "\n========== IDV GET ERROR =========="
      );
      console.error(
        "Message:",
        error.message
      );
      console.error(
        "Status:",
        error.response?.status
      );
      console.error(
        "Plaid response:",
        error.response?.data
      );
      console.error(
        "===================================\n"
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get identity verification",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.response?.data ||
              error.message
            : undefined,
      });
    }
  }
);

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

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(
    `Server running: http://localhost:${PORT}`
  );
});