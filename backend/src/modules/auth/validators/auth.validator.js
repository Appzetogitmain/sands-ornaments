const Joi = require("joi");

exports.sendOtpSchema = Joi.object({
  phone: Joi.string().length(10).pattern(/^[0-9]+$/).required().messages({
    "string.length": "Phone number must be exactly 10 digits",
    "string.pattern.base": "Phone number must contain only digits",
  }),
  type: Joi.string().valid("login", "signup", "checkout").optional(),
});

exports.verifyOtpSchema = Joi.object({
  phone: Joi.string().length(10).pattern(/^[0-9]+$/).required(),
  otp: Joi.string().length(4).required(),
  type: Joi.string().valid("login", "signup", "checkout").optional(),
  name: Joi.string().allow("", null).optional(),
  email: Joi.string().email().allow("", null).optional(),
});

exports.adminLoginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

exports.sellerRegisterSchema = Joi.object({
  fullName: Joi.string().min(3).max(100).pattern(/^[A-Za-z\s]+$/).required().messages({
    "string.pattern.base": "Full name should contain only alphabets",
  }),
  mobileNumber: Joi.string().length(10).pattern(/^[0-9]+$/).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  shopName: Joi.string().min(3).max(100).required(),
  shopAddress: Joi.string().required(),
  city: Joi.string().pattern(/^[A-Za-z\s]+$/).required().messages({
    "string.pattern.base": "City should contain only alphabets",
  }),
  state: Joi.string().pattern(/^[A-Za-z\s]+$/).required().messages({
    "string.pattern.base": "State should contain only alphabets",
  }),
  acceptTerms: Joi.any().required(),
});

exports.sellerLoginSchema = Joi.object({
  email: Joi.string().email().optional(),
  identifier: Joi.string().optional(),
  password: Joi.string().required(),
}).or("email", "identifier");

exports.sellerSendResetOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

exports.sellerResetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

exports.sellerSendResetMobileOtpSchema = Joi.object({
  mobileNumber: Joi.string().length(10).pattern(/^[0-9]+$/).required(),
});

exports.sellerResetPasswordMobileSchema = Joi.object({
  mobileNumber: Joi.string().length(10).pattern(/^[0-9]+$/).required(),
  otp: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

exports.adminSendResetOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

exports.adminResetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

exports.adminSendResetMobileOtpSchema = Joi.object({
  mobileNumber: Joi.string().required(),
});

exports.adminResetPasswordMobileSchema = Joi.object({
  mobileNumber: Joi.string().required(),
  otp: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

