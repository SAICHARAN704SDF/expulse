# Expluse UI/UX Architecture

## Experience Goal
Build a premium, cinematic scan product that feels like a wellness-grade mobile scanner while staying simple enough for web users.

## Information Architecture
- Public routes:
  - `/`: Hero and product framing
  - `/login`, `/signup`: Authentication
- Protected routes:
  - `/dashboard`: Real-time scan experience (primary product surface)
  - `/history`: Session history and PDF reports
  - `/profile`: User account management

## Dashboard UX States
- Idle:
  - Camera ready
  - Tips visible
  - Scan controls enabled
- Scanning:
  - Oval face guide animates
  - Sweep line and progress bar run
  - Frame capture every 200ms
  - Inference requests every 4 seconds
- Complete:
  - HR/RR waveforms + metric cards stabilized
  - Quality badge and confidence shown
- Error:
  - Face-not-found and quality warnings shown inline
  - User gets actionable guidance

## Interaction Pipeline
1. User clicks Start Scan
2. Frontend resets backend session with `reset_session: true`
3. Frontend captures webcam JPEG frames into rolling buffer
4. Frontend sends latest frame batch to `/predict`
5. Backend returns vitals and quality metrics
6. Frontend animates waveform and stat cards
7. User can complete or reset session

## Visual System
- Tone: Dark cinematic with cold-blue plus warm-red accents
- Typography:
  - Display: Sora
  - Body/UI: Space Grotesk
- Surface style:
  - Glass panels
  - Soft neon borders
  - Multi-layer gradients
- Motion:
  - Face oval pulse
  - Scan sweep line
  - Ambient radial ring drift
  - Waveform glow pulse

## Component Architecture
- `RealtimeVitalsMonitor`
  - State machine: idle, scanning, complete
  - Camera panel + oval overlay
  - Instruction and controls panel
  - HR/RR waveform cards
  - Metric chips (quality, confidence, SDNN, RMSSD)
- `Navbar`
  - Frosted dark shell
  - Brand identity and route entry points
- `Dashboard`
  - Hero framing + monitor embed

## Backend Contract For UI
Request:
- `session_id`
- `frames`
- `fps`
- `model_preference`
- `reset_session`

Response:
- `bpm`
- `respiratory_rate`
- `sdnn_ms`
- `rmssd_ms`
- `confidence`
- `signal_quality`
- `quality_label`
- `model_used`
- `warning`

## Accessibility Rules
- Keep text contrast above WCAG AA where possible
- Preserve keyboard access for Start/Complete/Reset controls
- Use concise, action-oriented error messages
- Do not rely on color alone for quality status

## Responsiveness
- Desktop: split layout (camera + guidance panel)
- Mobile/tablet: stacked blocks with reduced waveform typography
- Ensure control targets remain touch-friendly (>= 40px height)

## Future UX Enhancements
- Add camera permission preflight card
- Add per-scan summary modal and save-to-history CTA
- Add skin-tone adaptive exposure guidance
- Add optional low-power mode for slower devices
