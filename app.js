if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker Registered'));
}

const MODEL_URL = 'https://huggingface.co/username/SD-Turbo/resolve/main/model.onnx';
const CACHE_NAME = 'nyvera-model-cache';

let model;

async function loadModel() {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(MODEL_URL);

  const progressContainer = document.getElementById('download-container');
  const progressBar = document.getElementById('download-progress');
  const percentText = document.getElementById('download-percent');

  let modelData;

  if (cachedResponse) {
    console.log('Loaded model from cache');
    modelData = await cachedResponse.arrayBuffer();
  } else {
    console.log('Downloading model...');
    progressContainer.style.display = 'block';

    const response = await fetch(MODEL_URL);
    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length');
    let receivedLength = 0;
    let chunks = [];

    while(true){
      const {done, value} = await reader.read();
      if(done) break;
      chunks.push(value);
      receivedLength += value.length;
      const percent = (receivedLength / contentLength * 100).toFixed(1);
      progressBar.value = percent;
      percentText.textContent = `${percent}%`;
    }

    modelData = new Uint8Array(receivedLength);
    let position = 0;
    for(let chunk of chunks){
      modelData.set(chunk, position);
      position += chunk.length;
    }

    cache.put(MODEL_URL, new Response(modelData));
    progressContainer.style.display = 'none';
  }

  model = await WebSD.loadModel(modelData);
  console.log('Model ready');
}

loadModel();

const messagesDiv = document.getElementById('messages');
const promptInput = document.getElementById('prompt');
const generateBtn = document.getElementById('generate');

function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

generateBtn.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  if(!prompt || !model) return;

  addMessage(prompt, 'user');
  promptInput.value = '';

  addMessage('Generating image...', 'ai');

  try {
    const imgData = await model.generate(prompt); // WebSD / ONNX API
    const canvas = document.createElement('canvas');
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    canvas.getContext('2d').putImageData(imgData, 0, 0);

    const imgEl = document.createElement('img');
    imgEl.src = canvas.toDataURL();
    addMessage('', 'ai');
    messagesDiv.lastChild.appendChild(imgEl);

  } catch(e) {
    addMessage('Error generating image', 'ai');
    console.error(e);
  }
});
