export class AudioComponent {
  ended = true;

  play = false;

  clip = null;

  src = '';

  constructor({ src }) {
    this.src = src;
  }
}

// @component
export class SoundComponent {
  play = false;

  loop = true;

  clip = null;

  src = '';

  constructor({ src, play, loop }) {
    this.src = src;
    this.play = play;
    this.loop = loop;
  }
}

export class AudioSystem {
  constructor() {
    this._audioContext = new AudioContext();
  }

  run({ entities }, { resourceMap }) {
    entities.forEach((e) => {
      const audios = e.components.filter((c) => c instanceof AudioComponent);
      if (!audios || audios.length === 0) return;
      for (let i = 0; i < audios.length; i++) {
        const audio = audios[i];
        if (!audio || !resourceMap[audio.src] || !resourceMap[audio.src].loaded) return;
        if (!audio.clip) {
          if (audio.decoding) return;
          audio.decoding = true;
          this._audioContext.decodeAudioData(resourceMap[audio.src].asset)
            .then((clip) => {
              audio.decoding = false;
              audio.clip = clip;
            });
          return;
        }
        if (!audio.play || !audio.ended) return;
        // SourceNodes are one use only.
        const sourceNode = this._audioContext.createBufferSource();
        sourceNode.buffer = audio.clip;
        sourceNode.connect(this._audioContext.destination);
        sourceNode.start(0);
        sourceNode.addEventListener('ended', () => {
          audio.ended = true;
        });
        audio.ended = false;
        audio.play = false;
      }
    });
  }
}

export class SoundSystem {
  constructor() {
    this._audioContext = new AudioContext();
    this._sound = null;
  }

  run(game) {
    const { scenes, currentScene, resourceMap } = game;
    const scene = scenes[currentScene];
    const { sound } = scene;

    if (!sound || (!sound.play && !sound.playing)) {
      this._clear();
      return;
    }
    if (!resourceMap[sound.src] || !resourceMap[sound.src].loaded) return;
    if (!sound.clip) {
      if (sound.decoding) return;
      sound.decoding = true;
      this._audioContext.decodeAudioData(resourceMap[sound.src].asset)
        .then((clip) => {
          sound.decoding = false;
          sound.clip = clip;
        });
      return;
    }
    if (!sound.playing) {
      this._clear();
      this._bgAudioNode = this._audioContext.createBufferSource();
      this._bgAudioNode.buffer = sound.clip;
      this._bgAudioNode.connect(this._audioContext.destination);
      this._bgAudioNode.loop = sound.loop;
      this._bgAudioNode.start(0);
      sound.playing = true;
      this._sound = sound;
    }
  }

  _clear() {
    if (this._bgAudioNode) {
      this._bgAudioNode.stop(0);
      this._bgAudioNode = null;
      if (this._sound) this._sound.playing = false;
    }
  }
}
