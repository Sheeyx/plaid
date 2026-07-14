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

const PORT = Number(process.env.PORT || 5009);

const publicPath = path.join(
  __dirname,
  "..",
  "public"
);

app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.static(publicPath));

/* =========================================================
   PLAID CONFIGURATION
========================================================= */

const plaidEnv = String(
  process.env.PLAID_ENV || "sandbox"
)
  .trim()
  .toLowerCase();

const plaidClientId = String(
  process.env.PLAID_CLIENT_ID || ""
).trim();

const plaidSecret = String(
  process.env.PLAID_SECRET || ""
).trim();

const plaidTemplateId = String(
  process.env.PLAID_IDV_TEMPLATE_ID || ""
).trim();

if (!PlaidEnvironments[plaidEnv]) {
  throw new Error(
    `Invalid PLAID_ENV: ${plaidEnv}. Use sandbox, development, or production.`
  );
}

if (!plaidClientId) {
  throw new Error(
    "PLAID_CLIENT_ID is missing in .env"
  );
}

if (!plaidSecret) {
  throw new Error(
    "PLAID_SECRET is missing in .env"
  );
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

const zohoClientId = String(
  process.env.ZOHO_CLIENT_ID || ""
).trim();

const zohoClientSecret = String(
  process.env.ZOHO_CLIENT_SECRET || ""
).trim();

const zohoRefreshToken = String(
  process.env.ZOHO_REFRESH_TOKEN || ""
).trim();

const zohoAccountsUrl = String(
  process.env.ZOHO_ACCOUNTS_URL ||
    "https://accounts.zoho.com"
)
  .trim()
  .replace(/\/$/, "");

const zohoApiUrl = String(
  process.env.ZOHO_API_URL ||
    "https://www.zohoapis.com"
)
  .trim()
  .replace(/\/$/, "");

const zohoLeadsModule = String(
  process.env.ZOHO_LEADS_MODULE ||
    "Leads"
).trim();

/* =========================================================
   ZOHO FIELD API NAMES
========================================================= */

const zohoPlaidTokenField = String(
  process.env.ZOHO_PLAID_TOKEN_FIELD ||
    "Plaid_Token"
).trim();

const zohoLeadStatusField = String(
  process.env.ZOHO_LEAD_STATUS_FIELD ||
    "Lead_Status"
).trim();

const zohoAllowedLeadStatus = String(
  process.env.ZOHO_ALLOWED_LEAD_STATUS ||
    "Interested"
).trim();

const zohoTokenStatusField = String(
  process.env.ZOHO_TOKEN_STATUS_FIELD ||
    "Plaid_Token_Status"
).trim();

const zohoTokenUsedField = String(
  process.env.ZOHO_TOKEN_USED_FIELD ||
    "Plaid_Token_Used_Time"
).trim();

const zohoPlaidStageField = String(
  process.env.ZOHO_PLAID_STAGE_FIELD ||
    "Plaid_Stage"
).trim();

const zohoPaymentConditionField = String(
  process.env
    .ZOHO_PAYMENT_CONDITION_FIELD ||
    "Payment_Condition"
).trim();

/* =========================================================
   ZOHO FORM URLS FROM .ENV
========================================================= */

const zohoPrepaidFormUrl = String(
  process.env.ZOHO_FORM_PREPAID_URL ||
    ""
).trim();

const zohoCreditLineFormUrl = String(
  process.env
    .ZOHO_FORM_CREDIT_LINE_URL ||
    ""
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

const PLAID_STAGE_ZOHO_FORM = String(
  process.env.ZOHO_STAGE_ZOHO_FORM ||
    "Zoho form"
).trim();

const PLAID_STAGE_VERIFICATION = String(
  process.env.ZOHO_STAGE_VERIFICATION ||
    "Plaid verification"
).trim();

const PLAID_STAGE_COMPLETED = String(
  process.env.ZOHO_STAGE_COMPLETED ||
    "Completed"
).trim();

/* =========================================================
   REQUIRED ENV VALIDATION
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

if (!zohoPrepaidFormUrl) {
  throw new Error(
    "ZOHO_FORM_PREPAID_URL is missing in .env"
  );
}

if (!zohoCreditLineFormUrl) {
  throw new Error(
    "ZOHO_FORM_CREDIT_LINE_URL is missing in .env"
  );
}

try {
  new URL(zohoPrepaidFormUrl);
} catch (error) {
  throw new Error(
    "ZOHO_FORM_PREPAID_URL is not a valid URL"
  );
}

try {
  new URL(zohoCreditLineFormUrl);
} catch (error) {
  throw new Error(
    "ZOHO_FORM_CREDIT_LINE_URL is not a valid URL"
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

console.log(
  "ZOHO_ACCOUNTS_URL:",
  zohoAccountsUrl
);

console.log(
  "ZOHO_API_URL:",
  zohoApiUrl
);

console.log(
  "ZOHO_LEADS_MODULE:",
  zohoLeadsModule
);

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
  "ZOHO_TOKEN_USED_FIELD:",
  zohoTokenUsedField
);

console.log(
  "ZOHO_PLAID_STAGE_FIELD:",
  zohoPlaidStageField
);

console.log(
  "ZOHO_PAYMENT_CONDITION_FIELD:",
  zohoPaymentConditionField
);

console.log(
  "ZOHO_FORM_PREPAID_URL exists:",
  Boolean(zohoPrepaidFormUrl)
);

console.log(
  "ZOHO_FORM_CREDIT_LINE_URL exists:",
  Boolean(zohoCreditLineFormUrl)
);

console.log(
  "ZOHO_STAGE_ZOHO_FORM:",
  PLAID_STAGE_ZOHO_FORM
);

console.log(
  "ZOHO_STAGE_VERIFICATION:",
  PLAID_STAGE_VERIFICATION
);

console.log(
  "ZOHO_STAGE_COMPLETED:",
  PLAID_STAGE_COMPLETED
);

console.log("================================");

/* =========================================================
   ZOHO ACCESS TOKEN CACHE
========================================================= */

let cachedZohoAccessToken = null;
let zohoAccessTokenExpiresAt = 0;

async function getZohoAccessToken() {
  const currentTime = Date.now();

  const tokenIsStillValid =
    cachedZohoAccessToken &&
    currentTime <
      zohoAccessTokenExpiresAt -
        5 * 60 * 1000;

  if (tokenIsStillValid) {
    return cachedZohoAccessToken;
  }

  console.log(
    "\n========== ZOHO ACCESS TOKEN REFRESH =========="
  );

  const requestBody =
    new URLSearchParams({
      refresh_token: zohoRefreshToken,
      client_id: zohoClientId,
      client_secret: zohoClientSecret,
      grant_type: "refresh_token",
    }).toString();

  const response = await axios.post(
    `${zohoAccountsUrl}/oauth/v2/token`,
    requestBody,
    {
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      timeout: 15000,

      validateStatus() {
        return true;
      },
    }
  );

  console.log(
    "Zoho OAuth HTTP status:",
    response.status
  );

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !response.data?.access_token
  ) {
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
    currentTime +
    expiresInSeconds * 1000;

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
   HELPER FUNCTIONS
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

  return (
    token.substring(0, 8) +
    "..." +
    token.substring(token.length - 4)
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizePlaidStage(value) {
  return normalizeText(value);
}

function normalizePaymentCondition(value) {
  return normalizeText(value);
}

function formatZohoDateTime(
  date = new Date()
) {
  return date.toISOString();
}

/* =========================================================
   PAYMENT CONDITION FORM ROUTING
========================================================= */

function getFormConfigForPaymentCondition(
  paymentCondition
) {
  const normalizedCondition =
    normalizePaymentCondition(
      paymentCondition
    );

  if (normalizedCondition === "prepaid") {
    return {
      formType: "prepaid",
      formUrl: zohoPrepaidFormUrl,
    };
  }

  if (
    normalizedCondition ===
      "credit line" ||
    normalizedCondition ===
      "creditline"
  ) {
    return {
      formType: "credit_line",
      formUrl: zohoCreditLineFormUrl,
    };
  }

  return null;
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

        "Content-Type":
          "application/json",
      },

      timeout: 15000,

      validateStatus() {
        return true;
      },
    }
  );

  console.log(
    "Zoho update HTTP status:",
    response.status
  );

  console.log(
    "Zoho update response:",
    JSON.stringify(
      response.data,
      null,
      2
    )
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
    !result ||
    result.status !== "success"
  ) {
    throw new Error(
      `Zoho Lead update rejected: ${JSON.stringify(
        result || response.data
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

async function updateLeadFieldsBestEffort(
  leadId,
  fields,
  context
) {
  try {
    await updateLeadFields(
      leadId,
      fields
    );

    return true;
  } catch (error) {
    console.error(
      `Best-effort CRM update failed: ${context}`
    );

    console.error(
      "Lead ID:",
      leadId
    );

    console.error(
      "Error:",
      error.message
    );

    return false;
  }
}

/* =========================================================
   VALIDATE TOKEN USING ZOHO COQL
========================================================= */

async function validateLeadToken(
  rawToken
) {
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
      ${zohoTokenUsedField},
      ${zohoPlaidStageField},
      ${zohoPaymentConditionField}
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

        "Content-Type":
          "application/json",
      },

      timeout: 15000,

      validateStatus() {
        return true;
      },
    }
  );

  console.log(
    "Zoho COQL HTTP status:",
    response.status
  );

  console.log(
    "Zoho COQL response:",
    JSON.stringify(
      response.data,
      null,
      2
    )
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

  const leads =
    Array.isArray(response.data?.data)
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

    console.log(
      "Duplicate Lead IDs:",
      leads.map((lead) => lead.id)
    );

    return {
      valid: false,
      statusCode: 409,
      message:
        "Duplicate verification token found",
    };
  }

  const lead = leads[0];

  console.log(
    "Matching Lead found"
  );

  console.log(
    "Lead ID:",
    lead.id
  );

  console.log(
    "Lead name:",
    `${lead.First_Name || ""} ${
      lead.Last_Name || ""
    }`.trim()
  );

  console.log(
    "Lead email:",
    lead.Email || ""
  );

  console.log(
    "CRM saved token:",
    maskToken(
      lead[zohoPlaidTokenField]
    )
  );

  console.log(
    "CRM Lead Status:",
    lead[zohoLeadStatusField]
  );

  console.log(
    "CRM Token Status:",
    lead[zohoTokenStatusField]
  );

  console.log(
    "CRM Plaid Stage:",
    lead[zohoPlaidStageField]
  );

  console.log(
    "CRM Payment Condition:",
    lead[zohoPaymentConditionField]
  );

  const savedToken = String(
    lead[zohoPlaidTokenField] || ""
  )
    .trim()
    .toLowerCase();

  if (savedToken !== crmToken) {
    console.log(
      "VALIDATION RESULT: TOKEN DOES NOT MATCH"
    );

    return {
      valid: false,
      statusCode: 403,
      message:
        "Verification token is invalid",
    };
  }

  const currentLeadStatus =
    String(
      lead[zohoLeadStatusField] ||
        ""
    ).trim();

  if (
    normalizeText(currentLeadStatus) !==
    normalizeText(
      zohoAllowedLeadStatus
    )
  ) {
    console.log(
      "VALIDATION RESULT: LEAD STATUS NOT ALLOWED"
    );

    console.log(
      "Current Lead Status:",
      currentLeadStatus
    );

    console.log(
      "Required Lead Status:",
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

  console.log(
    "Token Status:",
    tokenStatus || "(empty)"
  );

  if (
    normalizeText(tokenStatus) !==
    normalizeText(
      TOKEN_STATUS_ACTIVE
    )
  ) {
    let message =
      "This verification link is not active";

    const normalizedTokenStatus =
      normalizeText(tokenStatus);

    if (
      normalizedTokenStatus ===
      normalizeText(
        TOKEN_STATUS_USED
      )
    ) {
      message =
        "This verification link has already been used";
    } else if (
      normalizedTokenStatus ===
      normalizeText(
        TOKEN_STATUS_EXPIRED
      )
    ) {
      message =
        "This verification link has expired";
    } else if (
      normalizedTokenStatus ===
      normalizeText(
        TOKEN_STATUS_REVOKED
      )
    ) {
      message =
        "This verification link has been revoked";
    }

    console.log(
      "VALIDATION RESULT: TOKEN IS NOT ACTIVE"
    );

    console.log(
      "Validation message:",
      message
    );

    return {
      valid: false,
      statusCode: 403,
      message,
    };
  }

  const paymentCondition = String(
    lead[
      zohoPaymentConditionField
    ] || ""
  ).trim();

  console.log(
    "VALIDATION RESULT: TOKEN IS ACTIVE"
  );

  console.log(
    "Payment Condition:",
    paymentCondition || "(empty)"
  );

  console.log(
    "================================================\n"
  );

  return {
    valid: true,
    crmToken,
    lead,
    paymentCondition,
  };
}

/* =========================================================
   STATIC ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      publicPath,
      "index.html"
    )
  );
});

app.get("/verify", (req, res) => {
  res.sendFile(
    path.join(
      publicPath,
      "verify.html"
    )
  );
});

app.get("/complete", (req, res) => {
  res.sendFile(
    path.join(
      publicPath,
      "complete.html"
    )
  );
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    success: true,

    message:
      "Server is running",

    plaid_env: plaidEnv,

    zoho_connected: Boolean(
      zohoClientId &&
        zohoClientSecret &&
        zohoRefreshToken
    ),

    zoho_forms_configured:
      Boolean(
        zohoPrepaidFormUrl &&
          zohoCreditLineFormUrl
      ),

    timestamp:
      new Date().toISOString(),
  });
});

/* =========================================================
   VALIDATE TOKEN AND SELECT ZOHO FORM
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
          message:
            "token is required",
        });
      }

      const validation =
        await validateLeadToken(
          token
        );

      if (!validation.valid) {
        return res
          .status(
            validation.statusCode ||
              403
          )
          .json({
            success: false,
            valid: false,
            message:
              validation.message,
          });
      }

      const {
        lead,
        paymentCondition,
      } = validation;

      const currentPlaidStage =
        String(
          lead[
            zohoPlaidStageField
          ] || ""
        ).trim();

      const effectivePlaidStage =
        currentPlaidStage ||
        PLAID_STAGE_ZOHO_FORM;

      const normalizedStage =
        normalizePlaidStage(
          effectivePlaidStage
        );

      const normalizedZohoFormStage =
        normalizePlaidStage(
          PLAID_STAGE_ZOHO_FORM
        );

      let selectedForm = null;

      /*
       * Faqat Zoho Form bosqichida
       * Payment Condition bo‘yicha
       * form tanlanadi.
       */
      if (
        normalizedStage ===
        normalizedZohoFormStage
      ) {
        selectedForm =
          getFormConfigForPaymentCondition(
            paymentCondition
          );

        if (!selectedForm) {
          console.log(
            "Unsupported Payment Condition:",
            paymentCondition ||
              "(empty)"
          );

          return res
            .status(422)
            .json({
              success: false,
              valid: false,

              message:
                "Payment Condition must be Prepaid or Credit line",
            });
        }

        console.log(
          "Selected Form Type:",
          selectedForm.formType
        );
      }

      /*
       * Plaid Stage bo‘sh bo‘lsa
       * birinchi bosqichga o‘rnatamiz.
       */
      if (!currentPlaidStage) {
        console.log(
          "First opening detected"
        );

        console.log(
          "Setting Plaid Stage:",
          PLAID_STAGE_ZOHO_FORM
        );

        await updateLeadFieldsBestEffort(
          lead.id,
          {
            [zohoPlaidStageField]:
              PLAID_STAGE_ZOHO_FORM,
          },
          "Set stage to Zoho form"
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
          effectivePlaidStage,

        payment_condition:
          paymentCondition,

        form_type:
          selectedForm?.formType ||
          null,

        form_url:
          selectedForm?.formUrl ||
          null,
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
        "HTTP Status:",
        error.response?.status
      );

      console.error(
        "External response:",
        error.response?.data
      );

      console.error(
        "============================================\n"
      );

      return res
        .status(500)
        .json({
          success: false,
          valid: false,

          message:
            "Could not validate verification token",
        });
    }
  }
);

/* =========================================================
   SET PLAID VERIFICATION STAGE
========================================================= */

app.post(
  "/api/stage/verification",
  async (req, res) => {
    try {
      console.log(
        "\n========== SET VERIFICATION STAGE =========="
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
          message:
            "token is required",
        });
      }

      const validation =
        await validateLeadToken(
          token
        );

      if (!validation.valid) {
        return res
          .status(
            validation.statusCode ||
              403
          )
          .json({
            success: false,
            message:
              validation.message,
          });
      }

      await updateLeadFields(
        validation.lead.id,
        {
          [zohoPlaidStageField]:
            PLAID_STAGE_VERIFICATION,
        }
      );

      console.log(
        "Lead ID:",
        validation.lead.id
      );

      console.log(
        "Plaid Stage changed to:",
        PLAID_STAGE_VERIFICATION
      );

      console.log(
        "============================================\n"
      );

      return res.json({
        success: true,

        message:
          "Plaid verification stage set",

        stage:
          PLAID_STAGE_VERIFICATION,
      });
    } catch (error) {
      console.error(
        "\n========== SET VERIFICATION STAGE ERROR =========="
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "HTTP Status:",
        error.response?.status
      );

      console.error(
        "Response:",
        error.response?.data
      );

      console.error(
        "==================================================\n"
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Could not prepare identity verification",
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
          message:
            "token is required",
        });
      }

      console.log(
        "Received token:",
        maskToken(token)
      );

      const validation =
        await validateLeadToken(
          token
        );

      if (!validation.valid) {
        console.log(
          "Token validation failed:",
          validation.message
        );

        return res
          .status(
            validation.statusCode ||
              403
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

      await updateLeadFieldsBestEffort(
        lead.id,
        {
          [zohoPlaidStageField]:
            PLAID_STAGE_VERIFICATION,
        },
        "Set stage after Plaid Link Token creation"
      );

      console.log(
        "Plaid Link Token created successfully"
      );

      console.log(
        "Lead ID:",
        lead.id
      );

      console.log(
        "Plaid request ID:",
        plaidResponse.data
          .request_id
      );

      console.log(
        "================================================\n"
      );

      return res.json({
        success: true,

        link_token:
          plaidResponse.data
            .link_token,

        request_id:
          plaidResponse.data
            .request_id,
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
        "HTTP Status:",
        error.response?.status
      );

      console.error(
        "External response:",
        error.response?.data
      );

      console.error(
        "=============================================\n"
      );

      return res
        .status(500)
        .json({
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
          message:
            "token is required",
        });
      }

      console.log(
        "Received token:",
        maskToken(token)
      );

      const validation =
        await validateLeadToken(
          token
        );

      if (!validation.valid) {
        return res
          .status(
            validation.statusCode ||
              403
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
        "HTTP Status:",
        error.response?.status
      );

      console.error(
        "Response:",
        error.response?.data
      );

      console.error(
        "========================================\n"
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Failed to update Plaid completion status",
        });
    }
  }
);

/* =========================================================
   GET PLAID IDENTITY VERIFICATION RESULT
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
        await plaidClient
          .identityVerificationGet({
            identity_verification_id:
              String(
                identity_verification_id
              ).trim(),
          });

      console.log(
        "Plaid IDV Status:",
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
        "HTTP Status:",
        error.response?.status
      );

      console.error(
        "Plaid response:",
        error.response?.data
      );

      console.error(
        "===================================\n"
      );

      return res
        .status(500)
        .json({
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