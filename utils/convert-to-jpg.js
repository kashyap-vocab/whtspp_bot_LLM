const fs = require("fs");
const path = require("path");
const imageType = require("image-type");
const sharp = require("sharp");

/**
 * Ensure image is a real JPEG (synchronous version).
 * If not, convert it to JPEG and overwrite in the same path.
 * @param {string} filePath - Full path of the image.
 * @returns {string} - Returns same file path after ensuring JPEG.
 */
async function ensureJpegSync(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const type = imageType(buffer);

    if (type && type.mime === "image/jpeg") {
      console.log(`✅ Already JPEG: ${filePath}`);
      return filePath;
    }

    console.log(`🔄 Converting ${filePath} to JPEG using sharp API...`);

    const tmpPath = `${filePath}.tmp.jpg`;
    await sharp(filePath).jpeg().toFile(tmpPath);
    fs.renameSync(tmpPath, filePath);

    console.log(`✅ Converted to JPEG: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error("❌ Error processing image:", err);
    throw err;
  }
}

// const fs = require("fs");
// const sharp = require("sharp");
// const imageType = require("image-type");

// /**
//  * Ensure image is a real JPEG (synchronous style).
//  * If not, convert it to JPEG and overwrite in the same path.
//  * @param {string} filePath - Full path of the image.
//  * @returns {Promise<string>} - Returns same file path after ensuring JPEG.
//  */
// async function ensureJpegSync(filePath) {
//   try {
//     // Read file buffer
//     const buffer = fs.readFileSync(filePath);
//     const type = imageType(buffer);

//     if (type && type.mime === "image/jpeg") {
//       console.log(`✅ Already JPEG: ${filePath}`);
//       return filePath;
//     }

//     console.log(`🔄 Converting ${filePath} to JPEG...`);

//     // Overwrite file as JPEG
//     await sharp(buffer).jpeg({ quality: 90 }).toFile(filePath);

//     console.log(`✅ Converted to JPEG: ${filePath}`);
//     return filePath;
//   } catch (err) {
//     console.error("❌ Error processing image:", err);
//     throw err;
//   }
// }

module.exports = { ensureJpegSync };
