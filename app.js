// app.js
const status = document.getElementById("status");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const HF_BASE = "https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/"; 
// EXAMPLE: You will pick a repo with ONNX files (text_encoder.onnx, unet.onnx, vae_decoder.onnx).
// See notes below for recommended repos & exact filenames (CORS required).

let pipeline = null; // the web-stable-diffusion pipeline instance

async function initPipeline() {
  if (pipeline) return pipeline;
  status.textContent = "Initializing pipeline — setting up WebGPU & ONNX Runtime...";

  // Check for WebGPU / ONNX availability
  if (!("gpu" in navigator && ort && ort.env && ort.env.wasm) && !ort) {
    status.textContent = "ONNX Runtime not ready in this browser. Use Chrome/Edge with WebGPU enabled.";
    throw new Error("WebGPU/ONNX not available");
  }

  // The vendor websd API will expect a config object that contains the ONNX model URLs.
  // This example expects that the vendor library exposes `WebSD` and a `createPipeline` method.
  // (This matches the pattern used by browser SD projects — if vendor API differs, adjust accordingly.)

  const modelFiles = {
    // Replace with exact file paths you want to use from HF (resolve/main/<path>).
    text_encoder: HF_BASE + "text_encoder/model.onnx",
    tokenizer: HF_BASE + "tokenizer/merges.txt", // many tokenizers require vocab/merges/.. or a tokenization json
    tokenizer_vocab: HF_BASE + "tokenizer/vocab.json",
    unet: HF_BASE + "unet/model.onnx",
    vae_decoder: HF_BASE + "vae_decoder/model.onnx"
  };

  status.textContent = "Creating browser pipeline and loading models (this may take awhile)...";

  // NOTE: websd.createPipeline is an example. The vendor script should provide a createFunction.
  // If you vendor mlc-ai/web-stable-diffusion, follow their README to instantiate the pipeline.
  pipeline = await WebSD.createPipeline({
    ortOptions: { executionProviders: ["webgpu"], webgpu: { devicePreference: "high-performance" } },
    modelFiles,
    // tune these options as needed: width, height, steps, scheduler, guidanceScale, seed etc.
    width: 1024,
    height: 1024,
    steps: 20,
    guidanceScale: 7.5
  });

  status.textContent = "✅ Pipeline ready (models cached after first load).";
  return pipeline;
}

async function generate(prompt) {
  try {
    status.textContent = "Generating — this runs multiple model calls; please wait...";
    const pipe = await initPipeline();

    // Use the pipeline API to create an image from prompt.
    // This matches typical web SD pipeline calls: pipeline.generate({prompt, ...})
    const result = await pipe.generate({ prompt });

    // `result` should contain an image buffer or base64 PNG depending on vendor implementation.
    // Many web-SD projects return an Uint8ClampedArray or RGBA float buffer. We convert to ImageData if needed.

    if (result && result.imageData) {
      // example: result.imageData is Uint8ClampedArray and result.width/height
      const imgData = new ImageData(result.imageData, result.width, result.height);
      // resize canvas to model size
      canvas.width = result.width;
      canvas.height = result.height;
      ctx.putImageData(imgData, 0, 0);
      status.textContent = "Done — image rendered (offline ready).";
      return;
    }

    // Some implementations return a DataURL
    if (result && result.dataUrl) {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = result.dataUrl;
      status.textContent = "Done — dataURI received.";
      return;
    }

    // Fallback: if vendor returns raw bytes, convert to blob
    if (result && result.blob) {
      const url = URL.createObjectURL(result.blob);
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
      };
      img.src = url;
      status.textContent = "Done — blob rendered.";
      return;
    }

    status.textContent = "Generation finished but output format is unknown. Check vendor API.";
    console.log("generate result:", result);
  } catch (e) {
    console.error(e);
    status.textContent = "Error: " + e.message;
  }
}

document.getElementById("generate").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value.trim();
  if (!prompt) return alert("Enter a prompt");
  await generate(prompt);
});

// Register service worker (if supported)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(err => console.warn("SW reg failed:", err));
}
