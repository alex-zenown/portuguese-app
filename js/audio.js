// Web Speech API wrapper for PT-PT TTS

let ptVoice = null;
let voicesLoaded = false;

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  // Prefer pt-PT, fallback to pt-BR, then any pt
  ptVoice = voices.find(v => v.lang === 'pt-PT')
    || voices.find(v => v.lang.startsWith('pt-PT'))
    || voices.find(v => v.lang === 'pt-BR')
    || voices.find(v => v.lang.startsWith('pt'))
    || null;
  voicesLoaded = voices.length > 0;
}

// Voices load asynchronously in some browsers
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();

export function speak(text, rate = 0.85) {
  return new Promise((resolve) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-PT';
    if (ptVoice) utterance.voice = ptVoice;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.speak(utterance);
  });
}

export function speakSlow(text) {
  return speak(text, 0.6);
}

// Get available Portuguese voices
export function getVoices() {
  const voices = speechSynthesis.getVoices();
  return voices.filter(v => v.lang.startsWith('pt'));
}

// MediaRecorder for self-recording
let mediaRecorder = null;
let audioChunks = [];

export async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.start();
    return true;
  } catch {
    return false;
  }
}

export function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      resolve(url);
    };

    mediaRecorder.stop();
  });
}

export function playRecording(url) {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play();
  });
}
