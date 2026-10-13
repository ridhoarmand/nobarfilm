export const AUDIO_ENHANCE_PARAMS = {
  enabled: {
    threshold: -24,
    knee: 12,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    gain: 1.6,
  },
  disabled: {
    threshold: 0,
    knee: 0,
    ratio: 1,
    attack: 0.003,
    release: 0.25,
    gain: 1.0,
  },
} as const;

export interface AudioParamTarget {
  setValueAtTime: (value: number, startTime: number) => void;
}

export interface DynamicsCompressorTarget {
  threshold: AudioParamTarget;
  knee: AudioParamTarget;
  ratio: AudioParamTarget;
  attack: AudioParamTarget;
  release: AudioParamTarget;
}

export interface GainTarget {
  gain: AudioParamTarget;
}

export function applyAudioEnhanceParams(
  enabled: boolean,
  ctx: { currentTime: number },
  compressor: DynamicsCompressorTarget,
  gain: GainTarget
): void {
  const params = enabled ? AUDIO_ENHANCE_PARAMS.enabled : AUDIO_ENHANCE_PARAMS.disabled;
  const t = ctx.currentTime;
  compressor.threshold.setValueAtTime(params.threshold, t);
  compressor.knee.setValueAtTime(params.knee, t);
  compressor.ratio.setValueAtTime(params.ratio, t);
  compressor.attack.setValueAtTime(params.attack, t);
  compressor.release.setValueAtTime(params.release, t);
  gain.gain.setValueAtTime(params.gain, t);
}
