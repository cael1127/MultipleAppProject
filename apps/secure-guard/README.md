## SecureGuard Sentinel

SecureGuard is now a full vibe-coding training ground paired with live incident tooling. Analysts can learn to spot shady builds, practice with guided challenges, and immediately apply their skills against active takedowns.

### Experience Highlights
- **Vibe coding curriculum** – Interactive learning modules teach how to read suspicious markup, reverse-engineer AI website dumps, and ask the right triage questions.
- **Heuristic lab** – Paste any snippet to get instant analysis on AI fingerprints, rushed inline styles, or supply-chain red flags.
- **Incident control center** – Authenticate to sync real SecureGuard incidents, review remediation tasks, and marry training with real-world response.
- **Rapid takedown timeline** – Visualize partner escalations alongside your progress so drills stay grounded in production ops.

### Running the demo
```sh
# at the workspace root:
npm run dev:secure-guard
```

The script boots the API and Expo dev server together. If Metro caching causes issues, re-run with:

```sh
npx expo start --clear --workspace @multiapps/secure-guard
```

