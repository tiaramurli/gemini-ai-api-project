const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({model: 'gemini-1.5-flash'});

const upload = multer({ dest: 'uploads/' });

app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({output: response.text()});
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function imageToGenerativePart(imagePath) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(imagePath)).toString('base64'),
            mimeType: 'image/jpeg',
        },
    };
}

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt ||  'Describe the image';
    const image = imageToGenerativePart(req.file.path);
    try {
        const result = await model.generateContent([prompt, image ]);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
  const filePath = req.file.path;
  const buffer = fs.readFileSync(filePath);
  const base64Data = buffer.toString('base64');
  const mimeType = req.file.mimetype;

  try {
    const documentPart = {
      inlineData: { data: base64Data, mimeType }
    };

    const result = await model.generateContent(['Analyze this document', documentPart]);
    const response = await result.response;
    res.json({ output: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    fs.unlinkSync(filePath);
  }
});

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
  const audioBuffer = fs.readFileSync(req.file.path);
  const base64Audio = audioBuffer.toString('base64');
  const audioPart = {
    inlineData: {
      data: base64Audio,
      mimeType: req.file.mimetype
    }
  };

  try {
    const result = await model.generateContent([
      'Transcribe or analyze the following audio:', audioPart
    ]);
    const response = await result.response;
    res.json({ output: response.text() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});


const PORT = 3000;
app.listen (PORT, () => {
  console.log(`Gemini API is running at http://localhost:${PORT}`);
})


