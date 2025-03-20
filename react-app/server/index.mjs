import express from 'express'
import ViteExpress from 'vite-express'
import multer from 'multer'
import {checkProgress, promptVideo, uploadVideo} from './upload.mjs'

const app = express()
app.use(express.json())

const upload = multer({dest: '/tmp/'})
app.post('/api/upload', upload.single('video'), async (req, res) => {
  console.log('hello world')
  try {
    const file = req.file
    const resp = await uploadVideo(file)
    res.json({data: resp})
  } catch (error) {
    res.status(500).json({error})
  }
})

app.post('/api/progress', async (req, res) => {
  try {
    const progress = await checkProgress(req.body.fileId)
    res.json({progress})
  } catch (error) {
    res.status(500).json({error})
  }
})

app.post('/api/prompt', async (req, res) => {
  try {
    const reqData = req.body
    const videoResponse = await promptVideo(
      reqData.uploadResult,
      reqData.prompt,
      reqData.model
    )
    res.json(videoResponse)
  } catch (error) {
    res.json({error}, {status: 400})
  }
})

const port = process.env.NODE_ENV === 'production' ? 8080 : 8000

ViteExpress.listen(app, port, () => console.log('Server is listening...'))
