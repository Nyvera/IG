const statusEl = document.getElementById("status");

async function loadPipeline() {
  statusEl.textContent = "Loading Stable Diffusion Turbo models...";

  // HF model repo (already optimized for ONNX Runtime)
  const baseUrl = "https://huggingface.co/onnx-community/stable-diffusion-turbo/resolve/main/";

  const textEncoderUrl = baseUrl + "text_encoder/model.onnx";
  const unetUrl = baseUrl + "unet/model.onnx";
  const vaeDecoderUrl = baseUrl + "vae_decoder/model.onnx";

  // Load sessions
  const textEncoder = await ort.InferenceSession.create(textEncoderUrl, { executionProviders: ["webgpu"] });
  const unet = await ort.InferenceSession.create(unetUrl, { executionProviders: ["webgpu"] });
  const vaeDecoder = await ort.InferenceSession.create(vaeDecoderUrl, { executionProviders: ["webgpu"] });

  statusEl.textContent = "✅ Models loaded (offline ready after first run)";

  return { textEncoder, unet, vaeDecoder };
}

async function generateImage(prompt) {
  statusEl.textContent = "Encoding prompt: " + prompt;

  // TODO: Full SD pipeline is complex — here we stub generation
  // (real pipeline = tokenize prompt → text encoder → UNet diffusion → VAE decode)

  const canvas = document.getElementById("output");
  const ctx = canvas.getContext("2d");

  // Fake "generation preview"
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "20px monospace";
  ctx.fillText("Generating: " + prompt, 10, 50);

  // Placeholder delay
  await new Promise(r => setTimeout(r, 2000));

  ctx.fillStyle = "lime";
  ctx.fillText("✅ Image Generated (stub)", 10, 100);

  statusEl.textContent = "Done.";
}

let pipeline = null;

document.getElementById("generate").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value;
  if (!pipeline) pipeline = await loadPipeline();
  await generateImage(prompt);
});
