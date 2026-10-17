import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSpeechRecognition, speakText } from '../src/speech.js'

test('spoken reply uses the selected language and completes through the mocked speech API', () => {
  const calls = []
  let finished = false
  const synthesis = {
    cancel() { calls.push('cancel') },
    speak(utterance) { calls.push(utterance) }
  }
  const createUtterance = text => ({ text })
  const started = speakText('Caption text', synthesis, createUtterance, 'te-IN', {
    onEnd() { finished = true }
  })

  assert.equal(started, true)
  assert.equal(calls[0], 'cancel')
  assert.equal(calls[1].text, 'Caption text')
  assert.equal(calls[1].lang, 'te-IN')
  assert.equal(calls[1].rate, 1)
  calls[1].onend()
  assert.equal(finished, true)
})

test('spoken reply falls back to captions when speech synthesis is unavailable', () => {
  let finished = false
  const started = speakText('Visible caption', null, () => ({}), 'en-IN', {
    onEnd() { finished = true }
  })
  assert.equal(started, false)
  assert.equal(finished, true)
})

test('microphone recognition is configured and controlled using a mock browser API', () => {
  class MockRecognition {
    start() { this.started = true }
    stop() { this.stopped = true }
  }
  let captured
  let ended
  const recognition = createSpeechRecognition(MockRecognition, 'hi-IN', {
    onResult(event) { captured = event.transcript },
    onEnd(instance) { ended = instance }
  })

  assert.equal(recognition.lang, 'hi-IN')
  assert.equal(recognition.continuous, false)
  assert.equal(recognition.interimResults, false)
  recognition.start()
  recognition.onresult({ transcript: 'fictional test phrase' })
  recognition.onend()
  recognition.stop()
  assert.equal(recognition.started, true)
  assert.equal(recognition.stopped, true)
  assert.equal(captured, 'fictional test phrase')
  assert.equal(ended, recognition)
})

test('microphone gracefully reports unsupported browsers', () => {
  assert.equal(createSpeechRecognition(undefined, 'en-IN'), null)
})
