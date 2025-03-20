import {GoogleGenerativeAI} from '@google/generative-ai'
import {GoogleAIFileManager} from '@google/generative-ai/server'

const key = process.env.VITE_GEMINI_API_KEY
const fileManager = new GoogleAIFileManager(key)
const genAI = new GoogleGenerativeAI(key)

export const uploadVideo = async file => {
  try {
    const uploadResult = await fileManager.uploadFile(file.path, {
      displayName: file.originalname,
      mimeType: file.mimetype
    })
    return uploadResult.file
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const checkProgress = async fileId => {
  try {
    const result = await fileManager.getFile(fileId)
    return result
  } catch (error) {
    console.error(error)
    return {error}
  }
}

export const promptVideo = async (uploadResult, prompt, model) => {
  try {
    const req = [
      {text: prompt},
      {
        fileData: {
          mimeType: uploadResult.mimeType,
          fileUri: uploadResult.uri
        }
      }
    ]
    const result = await genAI.getGenerativeModel({model}).generateContent(req)

    return {
      text: result.response.text(),
      candidates: result.response.candidates,
      feedback: result.response.promptFeedback
    }
  } catch (error) {
    console.error(error)
    return {error}
  }
}
