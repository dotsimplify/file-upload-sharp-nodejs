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
    console.log(req.files, "file details");
    req.files.images = [];
    sizes.forEach((size) => {
      const [newSize] = size.split("x");
      const filename = file.name.replace(/\..+$/, "");
      const newFilename = `subhash-${filename}-${newSize}-${newSize}+123.jpeg`;
      //   let img = `${__dirname}/public/uploads/${size}/123.jpg`;
      //   let img = `/tmp/${Math.random()*7}.jpg`;
      readFileAsync(file.tempFilePath)
        .then(async (buffer) => {
          await sharp(buffer)
            .resize(+newSize, +newSize)
            .toFile(`tmp/${newFilename}`);
          return `tmp/${newFilename}`;
        })
        .then(async (files) => {
          readFileAsync(files).then((file) => {
            // console.log(file, "buffer file");
            let cld_upload_stream = cloudinary.uploader.upload_stream(
              {
                folder: "test-upload",
              },
              async (err, result) => {
                if (err) throw err;
                return res.send(result);
              }
            );

            streamifier.createReadStream(file).pipe(cld_upload_stream);
          });
        });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/destroy", (req, res) => {
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

const removeFiles = async (path) => {
  path.map(async (singlePath) => {
    await fs.unlink(singlePath, (err) => {
      if (err) throw err;
    });
  });
};

// const uploadToCloudinary = (path) => {
//   cloudinary.uploader.upload(
//     file.tempFilePath,
//     { folder: "ecommerce assets" },
//     async (err, result) => {
//       if (err) throw err;
//       // removeTempFiles(file.tempFilePath);
//       return res.send({
//         public_id: result.public_id,
//         url: result.secure_url,
//       });
//     }
//   );
// };

async function uploadToCloudinary(locaFilePath) {
  // locaFilePath :
  // path of image which was just uploaded to "uploads" folder
  var mainFolderName = "testUpload";
  var filePathOnCloudinary = mainFolderName + "/" + locaFilePath;
  // filePathOnCloudinary :
  // path of image we want when it is uploded to cloudinary
  return cloudinary.uploader
    .upload(locaFilePath, { public_id: filePathOnCloudinary })
    .then((result) => {
      // Image has been successfully uploaded on cloudinary
      // So we dont need local image file anymore
      // Remove file from local uploads folder
      //   Fs.unlinkSync(locaFilePath);

      return {
        message: "Success",
        url: result.url,
      };
    })
    .catch((error) => {
      // Remove file from local uploads folder
      //   Fs.unlinkSync(locaFilePath);
      return { message: "Fail" };
    });
}

function bufferFromBufferString(bufferStr) {
  return Buffer.from(
    bufferStr
      .replace(/[<>]/g, "") // remove < > symbols from str
      .split(" ") // create an array splitting it by space
      .slice(1) // remove Buffer word from an array
      .reduce((acc, val) => acc.concat(parseInt(val, 16)), []) // convert all strings of numbers to hex numbers
  );
}
app.listen(port, () => console.log("server running on " + port));
