const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const OpenAI = require("openai");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
      file.mimetype
    );
    cb(ok ? null : new Error("unsupported_type"), ok);
  },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/api/alt-from-upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "missing_file" });

    const keyword = String(req.body.keyword || "");
    const charLimit = Math.min(parseInt(req.body.charLimit || "150", 10), 200);

    const resizedImageBuffer = await sharp(req.file.buffer)
      .resize({
        width: 512,
        withoutEnlargement: true,
        fit: "inside",
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64Image = `data:image/jpeg;base64,${resizedImageBuffer.toString(
      "base64"
    )}`;

    const userPrompt = keyword
      ? `Generate an accessible alt text for this image. Context keyword: "${keyword}".`
      : "Generate an accessible alt text for this image.";

    const responseAI = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You generate high-quality, accessible ALT text for images.

- Be clear, concise, descriptive
- Avoid "image of"
- Use UK/Ireland English
- Respect max ${charLimit} characters`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
      max_tokens: 100,
    });

    const altText =
      responseAI.choices?.[0]?.message?.content || "No ALT text generated";

    res.json({ altText });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "processing_failed" });
  }
});

module.exports = router;