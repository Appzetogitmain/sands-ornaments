const router = require("express").Router();
const logisticsController = require("../controllers/logistics.controller");

// Public pincode serviceability check
router.get("/check-pincode", logisticsController.checkPincodeServiceability);
router.post("/check-pincode", logisticsController.checkPincodeServiceability);

module.exports = router;
