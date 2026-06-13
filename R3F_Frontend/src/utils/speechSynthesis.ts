// Speech Synthesis Utility to parse simple SSML and control the WebSpeech API
import { useLawyers } from '../store/lawyer-store/lawyerStore'

let currentTimeouts: number[] = []
let globalSpeechRate = 1.0
let globalSpeechVolume = 1.0
let assignedVoices: { prosecution: SpeechSynthesisVoice | null, defense: SpeechSynthesisVoice | null } | null = null
let currentSessionId = 0

export function setGlobalSpeechRate(rate: number) {
  globalSpeechRate = rate
}

/** Sets the TTS volume in [0, 1]. Applied to every utterance the next time it
 *  is constructed; in-flight utterances are not affected (browser limitation). */
export function setGlobalSpeechVolume(volume: number) {
  globalSpeechVolume = Math.max(0, Math.min(1, volume))
}

export function resetVoices() {
  assignedVoices = null
  stopSpeech()
}

export function stopSpeech() {
  currentSessionId++
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  
  // Clear any pending breaks
  currentTimeouts.forEach((id) => clearTimeout(id))
  currentTimeouts = []
}

function getVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  return window.speechSynthesis.getVoices()
}

export function playSSML(ssml: string, side: 'prosecution' | 'defense') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  
  // Always stop existing speech before starting a new one
  stopSpeech()
  const sessionId = currentSessionId

  // Find a distinct voice if possible
  const voices = getVoices()
  
  if (!assignedVoices && voices.length > 0) {
    const pGender = useLawyers.getState().prosecution.persona.gender;
    const dGender = useLawyers.getState().defense.persona.gender;

    const maleNames = ['david', 'mark', 'george', 'james', 'richard', 'alex', 'daniel', 'fred', 'rishi', 'arthur', 'brian', 'male'];
    const femaleNames = ['zira', 'samantha', 'victoria', 'karen', 'susan', 'hazel', 'catherine', 'linda', 'fiona', 'moira', 'tessa', 'veena', 'female', 'girl', 'woman'];

    const getVoicesByGender = (gender: 'male' | 'female') => {
      const filtered = voices.filter(v => {
        const name = v.name.toLowerCase();
        if (gender === 'male') {
          return maleNames.some(n => name.includes(n)) && !name.includes('female');
        } else {
          return femaleNames.some(n => name.includes(n));
        }
      });
      return filtered.length > 0 ? filtered : voices;
    };

    const pVoices = getVoicesByGender(pGender);
    const dVoices = getVoicesByGender(dGender);

    let pVoice = pVoices[Math.floor(Math.random() * pVoices.length)];
    let dVoice = dVoices[Math.floor(Math.random() * dVoices.length)];

    // Ensure distinct voices if same gender and multiple options exist
    if (pVoice === dVoice && pGender === dGender && pVoices.length > 1) {
      const alternatives = pVoices.filter(v => v !== pVoice);
      if (alternatives.length > 0) {
        dVoice = alternatives[Math.floor(Math.random() * alternatives.length)];
      }
    }

    assignedVoices = {
      prosecution: pVoice,
      defense: dVoice
    }
  }
  
  const voice = assignedVoices ? assignedVoices[side] : (voices.find(v => v.default) || voices[0] || null)

  // Parse SSML chunks
  // We'll extract text outside tags, and handle <break>, <prosody>, <emphasis>
  // A simplistic approach:
  // 1. Remove <speak> and </speak>
  let content = ssml.replace(/<\/?speak>/gi, '')

  // 2. Split by tags to find breaks and prosody changes
  // Regex to match <tag> or </tag>
  const tagRegex = /(<[^>]+>)/g
  const tokens = content.split(tagRegex).filter(Boolean)

  let currentPitch = side === 'prosecution' ? 1.0 : 0.8 // Base pitch difference
  let currentRate = 1.0
  let isEmphasized = false

  const sequence: { text?: string, pauseMs?: number, pitch: number, rate: number }[] = []

  for (const token of tokens) {
    if (token.startsWith('<')) {
      const lowerToken = token.toLowerCase()

      if (lowerToken.startsWith('<break')) {
        const timeMatch = token.match(/time="(\d+)ms"/)
        if (timeMatch && timeMatch[1]) {
          // Multiply the base pause by 0.4 to significantly reduce the default gap size
          const rawMs = parseInt(timeMatch[1], 10)
          sequence.push({ pauseMs: rawMs * 0.4, pitch: currentPitch, rate: currentRate })
        }
      } else if (lowerToken.startsWith('<prosody')) {
        const pitchMatch = token.match(/pitch="([^"]+)"/i)
        const rateMatch = token.match(/rate="([^"]+)"/i)

        if (pitchMatch) {
          const p = pitchMatch[1].toLowerCase()
          if (p === 'high') currentPitch = 1.5
          else if (p === 'low') currentPitch = 0.6
          else if (p.endsWith('%')) currentPitch *= (1 + parseFloat(p) / 100)
        }
        if (rateMatch) {
          const r = rateMatch[1].toLowerCase()
          if (r === 'fast') currentRate = 1.3
          else if (r === 'slow') currentRate = 0.7
          else if (r.endsWith('%')) currentRate *= (1 + parseFloat(r) / 100)
        }
      } else if (lowerToken.startsWith('</prosody>')) {
        // Reset to base
        currentPitch = side === 'prosecution' ? 1.0 : 0.8
        currentRate = 1.0
      } else if (lowerToken.startsWith('<emphasis>')) {
        isEmphasized = true
      } else if (lowerToken.startsWith('</emphasis>')) {
        isEmphasized = false
      }
    } else {
      // It's text
      const text = token.trim()
      if (text) {
        // Apply emphasis by slightly lowering rate and increasing pitch
        const pitch = isEmphasized ? currentPitch * 1.2 : currentPitch
        const rate = isEmphasized ? currentRate * 0.9 : currentRate
        sequence.push({ text, pitch, rate })
      }
    }
  }

  // Play sequence recursively
  function playNext(index: number) {
    if (currentSessionId !== sessionId) return
    if (index >= sequence.length) return

    const item = sequence[index]
    if (item.pauseMs) {
      const id = window.setTimeout(() => {
        playNext(index + 1)
      }, item.pauseMs / globalSpeechRate)
      currentTimeouts.push(id)
    } else if (item.text) {
      const utterance = new SpeechSynthesisUtterance(item.text)
      if (voice) utterance.voice = voice
      utterance.pitch = Math.max(0, Math.min(2, item.pitch))
      utterance.rate = Math.max(0.1, Math.min(10, item.rate * globalSpeechRate))
      utterance.volume = globalSpeechVolume

      utterance.onend = () => {
        playNext(index + 1)
      }
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e)
        // Try to continue
        playNext(index + 1)
      }

      window.speechSynthesis.speak(utterance)
    }
  }

  if (sequence.length > 0) {
    playNext(0)
  }
}

/**
 * Strips SSML and converts <emphasis> to Markdown-like <b> for TrialHUD
 */
export function formatSSMLForUI(ssml: string): string {
  let text = ssml.replace(/<\/?speak>/gi, '')

  // Replace emphasis with bold HTML tag since we will use dangerouslySetInnerHTML
  text = text.replace(/<emphasis>/gi, '<b>')
  text = text.replace(/<\/emphasis>/gi, '</b>')

  // Remove breaks without adding ellipsis (just a space so words don't stick together)
  text = text.replace(/<break[^>]*>/gi, ' ')

  // Strip all other remaining XML/HTML tags except <b>
  // We use a regex that matches <something> unless it's <b> or </b>
  text = text.replace(/<\/?(?!(b|strong)\b)[^>]+>/gi, '')

  // Replace newlines with <br/> for UI rendering
  text = text.replace(/\n/g, '<br/>')

  // Remove repeating spaces
  text = text.replace(/ {2,}/g, ' ')
  // Trim leading and trailing whitespace and <br/> tags that might have been left over from stripped XML tags
  text = text.replace(/^(?:\s|<br\/>)+/, '')
  text = text.replace(/(?:\s|<br\/>)+$/, '')

  return text.trim()
}
