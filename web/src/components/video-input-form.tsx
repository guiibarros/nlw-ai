import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react'
import { FileVideo, Upload } from 'lucide-react'
import { fetchFile } from '@ffmpeg/util'

import { getFFmpeg } from '@/lib/ffmpeg'
import { api } from '@/lib/api'

import { Separator } from './ui/separator'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

interface VideoInputFormProps {
  onVideoUploaded(videoId: string): void
}

const statusMessages = {
  waiting: 'Carregar vídeo',
  converting: 'Convertendo...',
  uploading: 'Carregando...',
  generating: 'Transcrevendo...',
  success: 'Sucesso!',
} satisfies Record<Status, string>

export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')

  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null
    }
    
    return URL.createObjectURL(videoFile)
  }, [videoFile])

  async function convertVideoToAudio(video: File) {
    const ffmpeg = await getFFmpeg()
    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3'
    ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioFileBlob = new Blob([data], {
      type: 'audio/mpeg'
    })

    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg'
    })

    return audioFile
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = promptInputRef.current?.value
    
    if (!videoFile) {
      return
    }
    
    setStatus('converting')
    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()
    data.append('file', audioFile)
    
    setStatus('uploading')
    const createVideoResponse = await api.post('/videos', data)

    const { video } = createVideoResponse.data

    setStatus('generating')
    await api.post(`/videos/${video.id}/transcription`, {
      prompt,
    })

    setStatus('success')

    onVideoUploaded(video.id)
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if (!files) {
      return
    }

    const selectedFile = files[0]

    setVideoFile(selectedFile)
  }

  return (
    <form className='space-y-6' onSubmit={handleUploadVideo}>
      <label
        className='relative border flex items-center justify-center rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 text-muted-foreground hover:bg-primary/5 transition-colors'
        htmlFor="video"
      >
        {previewURL ? (
          <>
            <video className='absolute inset-0 pointer-events-none aspect-video' src={previewURL} />
          </>
        ) : (
          <>
            <FileVideo className='w-4 h-4' />
            Selecione um vídeo
          </>
        )}
      </label>

      <input
        disabled={status !== 'waiting'}
        type="file"
        id='video'
        accept='video/mp4'
        className='sr-only'
        onChange={handleFileSelected}
      />

      <Separator />

      <div className='space-y-2'>
        <Label htmlFor='transcription-prompt'>Prompt de transcrição</Label>
        <Textarea
          disabled={status !== 'waiting'}
          className='p-4 h-20 leading-relaxed resize-none'
          id='transcription-prompt'
          placeholder='Inclua palavras-chave mencionadas no vídeo separadas por vírgula'
          ref={promptInputRef}
        />
      </div>

      <Button
        data-success={status === 'success'}
        disabled={status !== 'waiting'}
        type='submit'
        className='w-full data-[success=true]:bg-emerald-400'
      >
        {statusMessages[status]}
        {status === 'waiting' && <Upload className='w-4 h-4 ml-2' />}
      </Button>
    </form>
  )
}