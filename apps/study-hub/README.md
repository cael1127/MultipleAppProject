## StudyForge Command Deck

StudyForge now ships as a sprint intelligence console where AI tutors, focus analytics, and cohort rooms sync through the shared backend so the demo feels like a production launch.

### Experience Highlights
- **AI tutor snapshots** pull structured data from the API with topics, action items, and timestamps for every adaptive check-in.
- **Cohort rooms** surface live collaboration spaces and trigger toast feedback when opening shared workspaces.
- **Sprint creator & tracker** lets you define goals, log focus sessions, and visualize timelines with reusable primitives.
- **Focus sparkline** updates as sessions are logged, showcasing the analytics loop in real time.

### Running the demo
```sh
# at the workspace root:
npm run dev:study
```

The script boots the API and Expo dev server together. If Metro caching causes issues, re-run with:

```sh
npx expo start --clear --workspace @multiapps/study-hub
```

