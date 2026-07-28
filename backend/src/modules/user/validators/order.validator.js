const Joi = require("joi");

const itemSchema = Joi.object({
  productId: Joi.string().required(),
  variantId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  isGiftCard: Joi.boolean().optional(),
  personalization: Joi.any().optional(),
  price: Joi.number().optional(),
  name: Joi.string().optional(),
  giftWrap: Joi.boolean().optional(),
  giftMessage: Joi.string().allow("").optional(),
});

const placeOrderSchema = Joi.object({
  items: Joi.array().items(itemSchema).min(1).required(),
  shippingAddress: Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().allow("").optional(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    flatNo: Joi.string().required(),
    area: Joi.string().required(),
    city: Joi.string().required(),
    district: Joi.string().allow(""),
    state: Joi.string().required(),
    pincode: Joi.string().length(6).required(),
  }).required(),
  paymentMethod: Joi.string().valid("razorpay", "cod").required(),
  couponCode: Joi.string().allow("").uppercase(),
  giftCardCodes: Joi.array().items(Joi.string().allow("")).optional(),
});

module.exports = { placeOrderSchema };

