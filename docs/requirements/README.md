# Requirements: profile-driven company builder

Start here: **[Generator Handoff.md](Generator%20Handoff.md)**. Propose a plan before changing code.

| File | What it is |
|---|---|
| `Generator Handoff.md` | What to build, what to reuse, phases, acceptance tests |
| `Synthetic Company Requirements.md` | The Larkspur Pay company profile (Part 1) and the output contract (Part 2) |
| `larkspur-pay.profile.yaml` | Larkspur Pay as a machine-readable profile: the generator's input and first test case |
| `reference/generate.py` | Working reference generator (Python) to port to the browser |
| `reference/out/` | Its output: the files and columns to match, plus the validation report |

Source of truth: these were written alongside the GRC platform design (its Foundation module defines the data shape). If they conflict with older notes in this repo, these win.
