const router = require("express").Router();
const fs = require("fs");
const auth = require("../middleware/auth");
const authAdmin = require("../middleware/authAdmin");
var cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});
//Admin accesed only
router.post("/upload", auth, authAdmin, (req, res) => {
  try {
    console.log(req.files);
    const formats = ["image/jpeg", "image/png"];
    if (!req.files || Object.keys(req.files).length === 0)
      return res.status(400).json({ message: "No files were uploaded" });
    const file = req.files.file;
    if (file.size > 1024 * 1024) {
      removeTempFiles(file.tempFilePath);
      res.status(400).json({ message: "Maximum allowed size is 1 MB" });
    }
    if (!formats.includes(file.mimetype)) {
      removeTempFiles(file.tempFilePath);
      return res.status(400).json({
        message: "Unsuporrted File format",
      });
    }
    cloudinary.uploader.upload(
      file.tempFilePath,
      { folder: "ecommerce assets" },
      async (err, result) => {
        if (err) throw err;
        removeTempFiles(file.tempFilePath);
        return res.json({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post("/destroy", auth, authAdmin, (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id)
      return res.status(400).json({ message: "No images selected" });
    cloudinary.uploader.destroy(public_id, async (err, result) => {
      if (err) throw err;
      return res.json({ message: "Image Deleted successfully" });
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
const removeTempFiles = async (path) => {
  await fs.unlink(path, (err) => {
    if (err) throw err;
  });
};
module.exports = router;
