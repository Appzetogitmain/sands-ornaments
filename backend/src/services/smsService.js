const axios = require("axios");

/**
 * SMS India Hub OTP Service
 * -------------------------------------------------------------
 * DEV MODE  : USE_REAL_OTP=false  ? OTP is always DEFAULT_OTP (1234), NO SMS sent
 * PROD MODE : USE_REAL_OTP=true   ? Send real OTP via SMS India Hub API
 * -------------------------------------------------------------
 */
const sendOtpSms = async (phone, otp) => {
  if (process.env.USE_REAL_OTP !== "true") {
    console.log(`[DEV] OTP for ${phone}: ${otp} (SMS not sent)`);
    return { success: true, dev: true };
  }

  try {
    const url = "https://cloud.smsindiahub.in/vendorsms/pushsms.aspx";
    const params = {
      APIKey: process.env.SMS_INDIA_API_KEY,
      msisdn: `91${phone}`,
      sid: process.env.SMS_INDIA_SENDER_ID,
      msg: `Welcome to the ${process.env.APP_NAME || "Sands Jewels"} powered by Appzeto.Your OTP for registration is ${otp}.BGADEC`,

      fl: "0",
      gwid: "2",
      dlttemplateid: process.env.SMS_INDIA_TEMPLATE_ID,
    };

    // Include dltentityid if defined in environment variables
    if (process.env.SMS_INDIA_ENTITY_ID) {
      params.dltentityid = process.env.SMS_INDIA_ENTITY_ID;
    }

    const response = await axios.get(url, { params });
    console.log(`[SMSIndiaHub] Sent OTP to ${phone}:`, response.data);
    return { success: true, response: response.data };
  } catch (err) {
    console.error("[SMSIndiaHub] Failed to send OTP:", err.message);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

module.exports = { sendOtpSms };
