const express = require("express");
const { ObjectId } = require("mongodb");

module.exports = function (menuCollection) {
  const router = express.Router();

  // Convert and validate MongoDB ObjectId
  function getObjectId(id) {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return null;
    }

    return new ObjectId(id);
  }

  // Validate menu item data
  function validateMenuItem(data, isUpdate = false) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return "Request body must be a JSON object";
    }

    const allowedFields = [
      "name",
      "price",
      "category",
      "emoji",
      "image",
      "available"
    ];

    const keys = Object.keys(data);

    if (keys.some(key => !allowedFields.includes(key))) {
      return "Unknown menu field provided";
    }

    if (isUpdate && keys.length === 0) {
      return "Provide at least one field to update";
    }

    if (!isUpdate) {
      if (!("name" in data) || !("price" in data) ||
          !("category" in data)) {
        return "Name, price and category are required";
      }
    }

    if ("name" in data &&
        (typeof data.name !== "string" ||
         !data.name.trim())) {
      return "Name must be a non-empty string";
    }

    if ("category" in data &&
        (typeof data.category !== "string" ||
         !data.category.trim())) {
      return "Category must be a non-empty string";
    }

    if ("price" in data &&
        (typeof data.price !== "number" ||
         !Number.isFinite(data.price) ||
         data.price <= 0 ||
         Math.round(data.price * 100) !== data.price * 100)) {
      return "Price must be positive with at most two decimal places";
    }

    if ("available" in data &&
        typeof data.available !== "boolean") {
      return "Available must be true or false";
    }

    for (const field of ["emoji", "image"]) {
      if (field in data && typeof data[field] !== "string") {
        return `${field} must be a string`;
      }
    }

    return null;
  }

  // =====================================
  // GET - Retrieve all menu items
  // =====================================

  router.get("/", async (req, res) => {
    const items = await menuCollection
      .find({})
      .sort({ category: 1, name: 1 })
      .toArray();

    res.status(200).json(items);
  });

  // =====================================
  // POST - Add a menu item
  // =====================================

  router.post("/", async (req, res) => {
    const error = validateMenuItem(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    const name = req.body.name.trim();

    // Check whether an item already exists
    const existingItem = await menuCollection.findOne({
      name: {
        $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i"
      }
    });

    if (existingItem) {
      return res.status(409).json({
        success: false,
        message: "Menu item already exists"
      });
    }

    const now = new Date();

    const newItem = {
      name,
      price: req.body.price,
      category: req.body.category.trim(),
      emoji: req.body.emoji || "",
      image: req.body.image || "",
      available: req.body.available ?? true,
      createdAt: now,
      updatedAt: now
    };

    try {
      const result = await menuCollection.insertOne(newItem);

      return res.status(201).json({
        ...newItem,
        _id: result.insertedId
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "Menu item already exists"
        });
      }

      throw error;
    }
  });

  // =====================================
  // PUT - Update a menu item
  // =====================================

  router.put("/:id", async (req, res) => {
    const id = getObjectId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid menu item ID"
      });
    }

    const error = validateMenuItem(req.body, true);

    if (error) {
      return res.status(400).json({
        message: error
      });
    }

    const updates = { ...req.body };

    if (updates.name !== undefined) {
      updates.name = updates.name.trim();

      const duplicate = await menuCollection.findOne({
        _id: { $ne: id },
        name: {
          $regex: `^${updates.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i"
        }
      });

      if (duplicate) {
        return res.status(409).json({
          message: "Another menu item has this name"
        });
      }
    }

    if (updates.category !== undefined) {
      updates.category = updates.category.trim();
    }

    updates.updatedAt = new Date();

    try {
      const result = await menuCollection.updateOne(
        { _id: id },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          message: "Menu item not found"
        });
      }

      const updatedItem = await menuCollection.findOne({
        _id: id
      });

      return res.status(200).json(updatedItem);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "Menu item already exists"
        });
      }

      throw error;
    }
  });

  // =====================================
  // DELETE - Remove a menu item
  // =====================================

  router.delete("/:id", async (req, res) => {
    const id = getObjectId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid menu item ID"
      });
    }

    const result = await menuCollection.deleteOne({
      _id: id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Menu item not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu item deleted successfully"
    });
  });

  return router;
};