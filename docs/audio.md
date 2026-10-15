# Lanterns Below

An original instrumental score written for Emberdeep on 2026-10-15, implemented in `src/audio/music.ts`.
No downloaded music, recordings, samples, audio services or third-party compositions are used.

The 64-beat theme lasts about 58 seconds at 66 BPM. A soft triangle-wave melody moves over sine-wave bass and fifths,
using a D-minor palette and an A-major turnaround. The two halves vary the phrase before it loops. Notes and harmonies
are specified directly as MIDI pitches in the source, under the repository's license.

Playback starts after a pointer or keyboard gesture. The existing sound button mutes music and effects together and
persists that setting. Music stops when the document is hidden or the root effect unmounts; returning resumes playback.
One AudioContext is shared with SFX. One 100ms look-ahead timer schedules notes, and oscillators disconnect when finished.
Throttled timers skip missed time rather than creating a catch-up burst. No audio resources are fetched from the network.

QA: `$env:SMOKE_CHANNEL='msedge'; node scripts/atmosphere-smoke.mjs http://127.0.0.1:5741/` with the dev server running.
It checks the real app's gesture unlock, mute/reload, hidden-tab pause, screen transitions and shared context at desktop
and phone viewport sizes. An OfflineAudioContext renders the same notes for a measurable, non-silent, low-level preview.
The generated excerpt is `docs/audio/lanterns-below-preview.wav`; it is a QA artifact, not a production download.
