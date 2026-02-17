"""
Gemini AI client for the transportation app.
Handles all communication with the Gemini API.
"""
import json
import logging
import os
from typing import Optional, Dict, Any, List
from django.conf import settings

# Import requests for HTTP fallback (more reliable on Windows/WSL)
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

logger = logging.getLogger(__name__)


def _should_disable_ssl() -> bool:
    """Check if SSL verification should be disabled (for development only)."""
    return getattr(settings, 'GEMINI_DISABLE_SSL_VERIFY', False)

# Gemini API endpoint for direct HTTP calls
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


class GeminiClient:
    """
    Singleton client for Gemini API.
    Provides methods for text generation and image analysis.
    """
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def reset(cls):
        """Reset the singleton instance. Call this after changing configuration."""
        cls._instance = None
        cls._initialized = False

    def __init__(self):
        if self._initialized:
            return

        self.api_key = getattr(settings, 'GEMINI_API_KEY', None)
        self.model = None
        self._use_http_fallback = False

        if not self.api_key:
            logger.warning("GEMINI_API_KEY not configured")
            self._initialized = True
            return

        # If SSL verification is disabled, use HTTP fallback (more controllable)
        if _should_disable_ssl():
            logger.info("SSL verification disabled - using HTTP fallback for better control")
            self._use_http_fallback = True
            self._initialized = True
            return

        if not GEMINI_AVAILABLE:
            logger.warning("google-generativeai package not installed, using HTTP fallback")
            self._use_http_fallback = True
            self._initialized = True
            return

        try:
            # Configure Gemini with REST transport to avoid gRPC SSL issues
            genai.configure(
                api_key=self.api_key,
                transport='rest'  # Use REST instead of gRPC to avoid SSL issues
            )
            self.model = genai.GenerativeModel('gemini-2.0-flash')  # Use stable model
            self._initialized = True
            logger.info("Gemini client initialized successfully with REST transport")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini SDK: {e}")
            logger.info("Falling back to HTTP-based API calls")
            self._use_http_fallback = True
            self._initialized = True

    @property
    def is_available(self) -> bool:
        """Check if Gemini is available and configured."""
        # Available if SDK model is ready or we can use HTTP fallback
        has_model = self.model is not None
        can_use_http = REQUESTS_AVAILABLE and self.api_key
        return has_model or can_use_http

    def _generate_via_http(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.3,
    ) -> Optional[str]:
        """
        Fallback method using direct HTTP requests.
        More control over SSL handling for problematic environments.
        """
        if not REQUESTS_AVAILABLE or not hasattr(self, 'api_key') or not self.api_key:
            return None

        try:
            # Build the request
            url = f"{GEMINI_API_URL}?key={self.api_key}"

            # Build content parts
            contents = []
            if system_instruction:
                contents.append({
                    "role": "user",
                    "parts": [{"text": f"System instruction: {system_instruction}\n\nUser request: {prompt}"}]
                })
            else:
                contents.append({
                    "role": "user",
                    "parts": [{"text": prompt}]
                })

            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": 4096,
                }
            }

            # Determine SSL verification setting
            verify_ssl = not _should_disable_ssl()

            if not verify_ssl:
                # Disable SSL warnings when verification is disabled
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

            # Retry logic for rate limits
            import time
            max_retries = 3
            for attempt in range(max_retries):
                response = requests.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    verify=verify_ssl,
                    timeout=60
                )

                if response.status_code == 429:
                    # Rate limited - wait and retry
                    wait_time = (attempt + 1) * 2  # 2, 4, 6 seconds
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue

                break

            response.raise_for_status()
            result = response.json()

            # Extract text from response
            if 'candidates' in result and result['candidates']:
                candidate = result['candidates'][0]
                if 'content' in candidate and 'parts' in candidate['content']:
                    parts = candidate['content']['parts']
                    if parts and 'text' in parts[0]:
                        return parts[0]['text']

            logger.error(f"Unexpected Gemini response format: {result}")
            return None

        except requests.exceptions.SSLError as e:
            logger.error(f"SSL error in HTTP fallback: {e}")
            logger.info("Try setting GEMINI_DISABLE_SSL_VERIFY=true in .env for development")
            return None
        except Exception as e:
            logger.error(f"HTTP fallback failed: {e}")
            return None

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> Optional[str]:
        """
        Generate text using Gemini.

        Args:
            prompt: The user prompt
            system_instruction: Optional system instruction
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response

        Returns:
            Generated text or None if failed
        """
        if not self.is_available:
            logger.error("Gemini not available")
            return None

        # Use HTTP fallback if SDK is not available or failed to initialize
        if self._use_http_fallback or self.model is None:
            logger.info("Using HTTP fallback for Gemini API")
            return self._generate_via_http(prompt, system_instruction, temperature)

        try:
            generation_config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }

            if system_instruction:
                model = genai.GenerativeModel(
                    'gemini-2.0-flash',
                    system_instruction=system_instruction
                )
            else:
                model = self.model

            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )

            return response.text

        except Exception as e:
            logger.error(f"Gemini SDK generation failed: {e}")
            # Try HTTP fallback
            logger.info("Attempting HTTP fallback after SDK failure")
            return self._generate_via_http(prompt, system_instruction, temperature)

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
    ) -> Optional[Dict[str, Any]]:
        """
        Generate structured JSON using Gemini.

        Args:
            prompt: The user prompt (should request JSON output)
            system_instruction: Optional system instruction
            temperature: Sampling temperature

        Returns:
            Parsed JSON dict or None if failed
        """
        response = self.generate(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=temperature
        )

        if not response:
            return None

        try:
            # Try to extract JSON from response
            # Remove markdown code blocks if present
            text = response.strip()
            if text.startswith('```json'):
                text = text[7:]
            elif text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]

            return json.loads(text.strip())

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.debug(f"Response was: {response}")
            return None

    def analyze_image(
        self,
        image_data: bytes,
        prompt: str,
        mime_type: str = "image/jpeg",
    ) -> Optional[str]:
        """
        Analyze an image with a text prompt.

        Args:
            image_data: Raw image bytes
            prompt: Text prompt describing what to analyze
            mime_type: MIME type of the image

        Returns:
            Analysis text or None if failed
        """
        if not self.is_available:
            logger.error("Gemini not available")
            return None

        try:
            import base64

            # Create image part
            image_part = {
                "mime_type": mime_type,
                "data": base64.b64encode(image_data).decode('utf-8')
            }

            response = self.model.generate_content([image_part, prompt])
            return response.text

        except Exception as e:
            logger.error(f"Gemini image analysis failed: {e}")
            return None

    def analyze_image_json(
        self,
        image_data: bytes,
        prompt: str,
        mime_type: str = "image/jpeg",
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze an image and return structured JSON.

        Args:
            image_data: Raw image bytes
            prompt: Text prompt requesting JSON output
            mime_type: MIME type of the image

        Returns:
            Parsed JSON dict or None if failed
        """
        response = self.analyze_image(image_data, prompt, mime_type)

        if not response:
            return None

        try:
            text = response.strip()
            if text.startswith('```json'):
                text = text[7:]
            elif text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]

            return json.loads(text.strip())

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse image analysis JSON: {e}")
            return None

    def analyze_multiple_images(
        self,
        images: List[Dict[str, Any]],
        prompt: str,
    ) -> Optional[str]:
        """
        Analyze multiple images together.

        Args:
            images: List of dicts with 'data' (bytes) and 'mime_type'
            prompt: Text prompt for analysis

        Returns:
            Analysis text or None if failed
        """
        if not self.is_available:
            logger.error("Gemini not available")
            return None

        try:
            import base64

            content_parts = []

            for img in images:
                image_part = {
                    "mime_type": img.get("mime_type", "image/jpeg"),
                    "data": base64.b64encode(img["data"]).decode('utf-8')
                }
                content_parts.append(image_part)

            content_parts.append(prompt)

            response = self.model.generate_content(content_parts)
            return response.text

        except Exception as e:
            logger.error(f"Gemini multi-image analysis failed: {e}")
            return None
