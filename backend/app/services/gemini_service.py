import os
import re
import json
import time
import logging
from typing import Dict, Any, Optional, List

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
# Suppress Google GenAI SDK internal AFC advisory logs
logging.getLogger("google.genai").setLevel(logging.ERROR)
logging.getLogger("google_genai").setLevel(logging.ERROR)

logger = logging.getLogger("CaloraAI.GeminiService")

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
        self.audio_model = os.getenv("GEMINI_AUDIO_MODEL", "gemini-3.7-flash")

        # Top-Down Quality Hierarchy: Starts with the most capable reasoning models and cascades downward
        self.text_fallback_models = [
            "gemini-3.7-flash",               # Top reasoning & clinical nutrition intelligence
            "gemini-3.6-flash",               # High-speed next-generation flagship
            "gemini-3.5-flash",               # Balanced multimodal model
            "gemini-3.1-flash-lite",          # Low-latency lightweight model
            "gemini-3.5-flash-lite",          # Ultra-fast lightweight model
            "gemini-flash-latest",            # Standard alias
            "gemini-2.0-flash"                # Reliable baseline
        ]

        # Top-Down Speech-to-Text Hierarchy: Proven multimodal audio models with high accuracy
        self.audio_fallback_models = [
            "gemini-3.7-flash",                       # High-fidelity multimodal audio STT
            "gemini-3.6-flash",                       # Ultra-fast audio transcription
            "gemini-3.5-flash",                       # Multimodal audio backup
            "gemini-2.0-flash",                       # Rock-solid audio baseline
            "gemini-flash-latest"                     # Standard alias
        ]

        self.client = None

        if self.api_key and self.api_key.strip() != "" and self.api_key != "your_gemini_api_key_here":
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                masked_key = self.api_key[:6] + "..." + self.api_key[-4:] if len(self.api_key) > 10 else "***"
                logger.info(f"[GeminiService] Client initialized successfully with API key: {masked_key}")
                logger.info(f"[GeminiService] Primary Model: '{self.model_name}' | Audio Model: '{self.audio_model}'")
            except Exception as e:
                logger.error(f"[GeminiService] Failed to initialize google-genai client: {e}")
        else:
            logger.warning("[GeminiService] No valid GEMINI_API_KEY found in .env.")

    def transcribe_audio(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
        """Transcribes audio using Top-Down Speech-to-Text cascade"""
        logger.info(f"[GeminiService] Received audio payload: bytes={len(audio_bytes)}, mime_type={mime_type}")

        if not self.client:
            raise ValueError("Gemini API client is not configured. Please check your GEMINI_API_KEY in .env.")

        # Prioritize configured primary audio model, then cascade down in quality order
        models_to_try = [self.audio_model] + [m for m in self.audio_fallback_models if m != self.audio_model]

        for model in models_to_try:
            try:
                from google.genai import types
                logger.info(f"[GeminiService] Dispatching audio to {model} for speech-to-text...")

                response = self.client.models.generate_content(
                    model=model,
                    contents=[
                        types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                        "Listen to this audio recording and transcribe the spoken words accurately into text. Return ONLY the transcribed text. Do not add quotes, markdown, or explanations."
                    ]
                )

                if response is not None and response.text:
                    transcript = response.text.strip()
                    if transcript:
                        logger.info(f"[GeminiService] Successfully transcribed: \"{transcript}\" via {model}")
                        return transcript
                    else:
                        logger.warning(f"[GeminiService] Model {model} produced empty text. Cascading to next model...")
                else:
                    logger.warning(f"[GeminiService] Model {model} returned no text candidate. Cascading to next model...")
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    logger.warning(f"[GeminiService] Rate limit hit on {model} (429 Quota Exhausted). Cascading to next model...")
                elif "404" in err_str or "NOT_FOUND" in err_str:
                    logger.warning(f"[GeminiService] Model {model} unavailable for API key (404 Not Found). Cascading to next model...")
                else:
                    logger.warning(f"[GeminiService] Speech-to-text failed on model {model}: {e}")
                continue

        logger.info("[GeminiService] All speech-to-text models evaluated. Returning empty transcript.")
        return ""

    def generate_json_response(self, prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
        """Invokes Gemini with structured JSON output and Top-Down quality cascade"""
        if not self.client:
            logger.warning("[GeminiService] Client uninitialized. Cannot generate JSON response.")
            return None

        # Prioritize configured primary model, then cascade down in quality order
        models_to_try = [self.model_name] + [m for m in self.text_fallback_models if m != self.model_name]

        for model in models_to_try:
            try:
                logger.info(f"[GeminiService] Executing structured JSON generation via {model}...")
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "system_instruction": system_instruction,
                        "response_mime_type": "application/json"
                    }
                )
                if response is not None and response.text:
                    raw_text = response.text
                    clean_text = raw_text.strip()
                    if clean_text.startswith("```"):
                        clean_text = re.sub(r"^```(?:json)?\n?", "", clean_text, flags=re.IGNORECASE)
                        clean_text = re.sub(r"\n?```$", "", clean_text)
                    parsed = json.loads(clean_text)
                    logger.info(f"[GeminiService] Structured response parsed successfully via {model}: keys={list(parsed.keys())}")
                    return parsed
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    logger.warning(f"[GeminiService] Rate limit hit on {model} (429 Quota Exhausted). Cascading to next model...")
                elif "404" in err_str or "NOT_FOUND" in err_str:
                    logger.warning(f"[GeminiService] Model {model} unavailable for API key (404 Not Found). Cascading to next model...")
                else:
                    logger.warning(f"[GeminiService] LLM JSON generation failed on {model}: {e}")
                continue

        logger.error("[GeminiService] All Gemini models failed to generate structured JSON.")
        return None

gemini_service = GeminiService()
