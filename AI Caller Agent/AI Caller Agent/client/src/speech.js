export function speakText(text, synthesis, createUtterance, language, { onEnd, onError } = {}) {
  if (!synthesis || !text) {
    onEnd?.()
    return false
  }
  synthesis.cancel()
  const utterance = createUtterance(text)
  utterance.lang = language
  utterance.rate = 1
  utterance.onend = () => onEnd?.()
  utterance.onerror = error => onError?.(error)
  synthesis.speak(utterance)
  return true
}

export function createSpeechRecognition(Recognition, language, { onResult, onError, onEnd } = {}) {
  if (!Recognition) return null
  const recognition = new Recognition()
  recognition.lang = language
  recognition.continuous = false
  recognition.interimResults = false
  recognition.onresult = event => onResult?.(event)
  recognition.onerror = error => onError?.(error)
  recognition.onend = () => onEnd?.(recognition)
  return recognition
}
