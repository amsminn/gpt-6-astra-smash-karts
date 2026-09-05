# Hugging Face trajectory upload

The Hugging Face CLI is installed in the project-local `.venv-hf` environment.
Its Codex skill is installed in `.agents/skills/hf-cli`.

Recreate the installation from the project root:

```sh
uv venv .venv-hf --python python3
uv pip install --python .venv-hf/bin/python -r requirements-hf.txt
npm run hf -- skills add
```

Run CLI commands with `npm run hf -- <command>`, for example:

```sh
npm run hf -- auth whoami
```

Dataset: <https://huggingface.co/datasets/amsminn/smash-karts-multiplayer-trajectory>

The uploaded session is “Smash Karts 멀티플레이 구현해줘”, with session ID
`01a070b9-c9b8-7d00-8cbf-8fd0416df521`. It uses the native Codex JSONL trace format.
The original workspace stages the upload copy in `artifacts/hf-dataset/`.
To obtain that copy after cloning this GitHub repository, run:

```sh
npm run hf -- download amsminn/smash-karts-multiplayer-trajectory --repo-type dataset --local-dir artifacts/hf-dataset
```

One repository access
credential was replaced in all five occurrences before publishing; the original
local session was left intact.

After reviewing any further edits, upload the staged dataset with:

```sh
npm run hf -- upload amsminn/smash-karts-multiplayer-trajectory artifacts/hf-dataset . --repo-type dataset
```
