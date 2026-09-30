const Category = require("../../../models/Category");
const { success, error } = require("../../../utils/apiResponse");

exports.getCategories = async (req, res) => {
  try {
    const scope = String(req.query?.scope || "all").trim().toLowerCase();
    const query = { isActive: true };

    if (scope === "navbar") {
      query.showInNavbar = true;
    } else if (scope === "collection") {
      query.showInCollection = true;
    }

    const categories = await Category.find(query)
      .sort({ sortOrder: 1, name: 1 });
      
    return success(res, { categories }, "Categories retrieved successfully");
  } catch (err) { return error(res, err.message); }
};

exports.getCategoryDetail = async (req, res) => {
  try {
    const { slug } = req.params;
    const mongoose = require("mongoose");
    const query = mongoose.isValidObjectId(slug)
      ? { $or: [{ _id: slug }, { slug }], isActive: true }
      : { slug, isActive: true };
    const category = await Category.findOne(query);

    if (!category) return error(res, "Category not found", 404);

    return success(res, { category }, "Category details retrieved");
  } catch (err) { return error(res, err.message); }
};
