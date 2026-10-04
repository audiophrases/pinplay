"""Qwen3-TTS voices for the Listening Studio.

Two 1.7B models, only one in memory at a time (each needs ~7 GB of RAM):
- "design" (VoiceDesign) makes a voice from a written description: each
  character's voice sample, and every line in acted mode;
- "copy" (Base) copies a character's voice sample into lines: fixed-voice
  mode, the default (LISTENING_STUDIO_PLAN.md section 8).
Lines are made in batches (several lines in one call), which test 0 showed
to be about 2.4 times faster on a processor."""
import gc
import os
import zlib

import numpy as np

MODELS = {
    'design': 'Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign',
    'copy': 'Qwen/Qwen3-TTS-12Hz-1.7B-Base',
}
# A voice sample is made in the character's everyday voice: copies keep the
# sample's tone, and a calm sample is what made test 0's Mia sound adult.
NEUTRAL = 'Speaking naturally in a calm, relaxed, conversational tone.'


class Stopped(Exception):
    """The teacher pressed Stop."""


class Voices:
    def __init__(self, threads=None, should_stop=None):
        self.should_stop = should_stop or (lambda: False)
        self.kind = None
        self.model = None
        self.prompts = {}  # sample key -> voice prompt (copy model)
        self.threads = threads or os.cpu_count() or 8

    def use(self, kind):
        if self.kind == kind:
            return self.model
        self.unload()
        import torch
        from qwen_tts import Qwen3TTSModel
        torch.set_num_threads(self.threads)
        self.model = Qwen3TTSModel.from_pretrained(MODELS[kind], device_map='cpu', dtype=torch.float32)
        self.kind = kind
        # Stop takes effect at the next step of making audio (a fraction of
        # a second), not after a whole batch: Qwen3's own generate() drops
        # stopping criteria, so a hook on the model checks the Stop button.
        inner = getattr(self.model, 'model', None)
        target = getattr(inner, 'talker', None) or inner
        if target is not None:
            target.register_forward_pre_hook(self._check_stop)
        return self.model

    def _check_stop(self, _module, _args):
        if self.should_stop():
            raise Stopped()

    def unload(self):
        self.model = None
        self.kind = None
        self.prompts = {}
        gc.collect()

    @staticmethod
    def _seed(name, take):
        import torch
        torch.manual_seed((zlib.crc32(name.encode()) + 7919 * int(take)) % (2 ** 31))

    def design(self, texts, instructs, language, name, take=0):
        """Lines (or a voice sample) from descriptions. Returns ([audio], sr)."""
        model = self.use('design')
        self._seed(name, take)
        wavs, sr = model.generate_voice_design(text=list(texts), instruct=list(instructs), language=[language] * len(texts))
        return [np.asarray(w, dtype=np.float32) for w in wavs], sr

    def copy(self, texts, sample_key, sample_audio, sample_sr, sample_text, language, name, take=0):
        """Lines in a character's fixed voice. Returns ([audio], sr)."""
        model = self.use('copy')
        if sample_key not in self.prompts:
            self.prompts[sample_key] = model.create_voice_clone_prompt(ref_audio=(sample_audio, sample_sr), ref_text=sample_text)
        self._seed(name, take)
        wavs, sr = model.generate_voice_clone(text=list(texts), language=[language] * len(texts),
                                              voice_clone_prompt=self.prompts[sample_key])
        return [np.asarray(w, dtype=np.float32) for w in wavs], sr
