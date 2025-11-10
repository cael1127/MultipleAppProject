## Nova Control Surface

Nova now behaves like a production automation studio. Operators can authenticate, build workflows, capture voice capsules, and simulate guardrails using the shared backend service.

### Experience Highlights
- **Workflow studio** lists live automations, step metadata, and smart suggestions so you can prototype new flows fast.
- **Voice capsule logger** lets you record transcripts, tag them for audits, and review the latest capsules in one tap.
- **Guardrail simulator** stress-tests prompts against guardrails and surfaces confidence plus review notes.
- **Launch timeline** keeps the narrative grounded in daily rehearsals, approvals, and rollout checkpoints.

### Running the demo
```sh
# from the workspace root
npm run dev:nova
```

The script boots the API and Expo dev server together. If Metro caching causes issues, rerun with:

```sh
npx expo start --clear --workspace @multiapps/ai-assistant
```

