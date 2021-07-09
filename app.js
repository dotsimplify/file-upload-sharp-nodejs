const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");
var fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const cloudinary = require("cloudinary").v2;
let streamifier = require("streamifier");
app.use(express.json());
const fileUpload = require("express-fileupload");
const sharp = require("sharp");
let port = process.env.PORT || 5000;
require("dotenv").config();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
// app.use(cookieParser());
app.use(cors());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});
app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/", (req, res) => {
  try {
    const sizes = ["300x300", "1024x1024", "2048x2048"];
    const formats = ["image/jpeg", "image/png"];
    if (!req.files || Object.keys(req.files).length === 0)
      return res.status(400).json({ message: "No files were uploaded" });
    const file = req.files.file;
    // if (file.size > 1024 * 1024) {
    //   //   removeTempFiles(file.tempFilePath);
    //   res.status(400).json({ message: "Maximum allowed size is 1 MB" });
    // }
    if (!formats.includes(file.mimetype)) {
      //   removeTempFiles(file.tempFilePath);
      return res.status(400).json({
        message: "Unsuporrted File format",
      });
    }
    sizes.forEach(async (size) => {
      const [newSize] = size.split("x");
      const filename = file.name.replace(/\..+$/, "");
      const newFilename = `subhash-${filename}-${newSize}-${newSize}+123.jpeg`;
      let buffer = await readFileAsync(file.tempFilePath);
      await sharp(buffer)
        .resize(+newSize, +newSize)
        .toFile(`tmp/${size}/${newFilename}`);
      let imageFiles = `tmp/${size}/${newFilename}`;

      //   readFileAsync(file.tempFilePath)
      //     .then((buffer) => {
      //       sharp(buffer)
      //         .resize(+newSize, +newSize)
      //         .toFile(`tmp/${size}/${newFilename}`, function (err) {
      //           if (err) {
      //             return err;
      //           }
      //         });
      //       return `tmp/${size}/${newFilename}`;
      //     })

      let stream = await readFileAsync(imageFiles);
      let cld_upload_stream = cloudinary.uploader.upload_stream(
        {
          folder: "test-upload",
        },
        async (err, result) => {
          if (err) throw err;
          return res.json(result);
        }
      );
      streamifier.createReadStream(stream).pipe(cld_upload_stream);
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// const removeTempFiles = (path) => {
//   fs.unlink(path, (err) => {
//     if (err) throw err;
//   });
// };
app.listen(port, () => console.log("server running on " + port));
