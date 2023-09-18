import fastify from 'fastify'
import fastifyCors from '@fastify/cors'

import { fetchAllPromptsRoute } from './routes/fetch-all-prompts'
import { uploadVideoRoute } from './routes/upload-video'
import { createTranscriptionRoute } from './routes/create-transcription'
import { generateAICompletionRoute } from './routes/generate-ai-completion'

const app = fastify()

app.register(fastifyCors, {
  origin: '*'
})

app.register(fetchAllPromptsRoute)
app.register(uploadVideoRoute)
app.register(createTranscriptionRoute)
app.register(generateAICompletionRoute)

app.listen({
  port: 3333,
  host: '0.0.0.0',
}).then(() => {
  console.log('🚀 HTTP server is running.')
})
