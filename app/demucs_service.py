import os
import torch
import soundfile as sf
import torchaudio
import logging
from demucs import pretrained
from demucs.apply import apply_model
from demucs.audio import AudioFile

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

def separate_instrumental(input_file: str, output_dir: str) -> str:
    logger.info(f"Starting separation for file: {input_file}")
    try:
        model = pretrained.get_model(name="htdemucs")
        model.to("cpu")
        model.eval()
        logger.debug("Model loaded and set to eval mode on CPU")

        # Load original audio info
        f = AudioFile(input_file)
        original_samplerate = f.samplerate()
        logger.debug(f"Original samplerate: {original_samplerate}")

        # Read audio at original sample rate
        waveform = f.read(streams=0, samplerate=original_samplerate)
        logger.debug(f"Loaded waveform shape: {waveform.shape}, samplerate: {original_samplerate}")

        # Resample input to 44100 Hz for Demucs model if needed
        target_sr = 44100
        if original_samplerate != target_sr:
            logger.debug(f"Resampling from {original_samplerate} Hz to {target_sr} Hz for model input")
            resampler = torchaudio.transforms.Resample(orig_freq=original_samplerate, new_freq=target_sr)
            waveform = resampler(waveform)
        else:
            logger.debug("No resampling needed for input")

        batch = waveform.unsqueeze(0)  # Add batch dim
        logger.debug(f"Batch shape (input to model): {batch.shape}")

        with torch.no_grad():
            sources = apply_model(model, batch, device="cpu")[0]
        logger.debug(f"Model output sources shape: {sources.shape}")

        stems = ["drums", "bass", "other", "vocals"]
        logger.debug(f"Stems detected: {stems}")
        for i, stem in enumerate(stems):
            logger.debug(f" - Stem '{stem}' max abs: {sources[i].abs().max().item()}")

        # Sum all but vocals for instrumental
        instrumental_sources = [sources[i] for i, stem in enumerate(stems) if stem != "vocals"]
        instrumental_mix = torch.stack(instrumental_sources).sum(dim=0)
        logger.debug(f"Instrumental mix shape: {instrumental_mix.shape}")

        max_val = instrumental_mix.abs().max().item()
        logger.debug(f"Max absolute value in instrumental mix before normalization: {max_val}")

        if max_val > 0:
            instrumental_mix /= max_val
        else:
            logger.warning("Instrumental mix max value is zero; output may be silent")

        # Resample output back to original sample rate if needed
        if original_samplerate != target_sr:
            logger.debug(f"Resampling output from {target_sr} Hz back to original {original_samplerate} Hz")
            resampler = torchaudio.transforms.Resample(orig_freq=target_sr, new_freq=original_samplerate)
            instrumental_mix = resampler(instrumental_mix)

        instrumental_np = instrumental_mix.cpu().numpy().T.astype('float32')
        logger.debug(f"Numpy instrumental array shape: {instrumental_np.shape}, dtype: {instrumental_np.dtype}")
        logger.debug(f"Instrumental data sample (first 10 samples): {instrumental_np[:10]}")

        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, "instrumental.wav")

        sf.write(output_path, instrumental_np, original_samplerate)
        logger.info(f"Saved instrumental audio to: {output_path}")

        filesize = os.path.getsize(output_path)
        logger.debug(f"Output file size: {filesize} bytes")

        if filesize < 1000:
            logger.warning("Output file size is suspiciously small, may be corrupted")

        return output_path

    except Exception as e:
        logger.exception(f"Error during separation: {e}")
        raise
