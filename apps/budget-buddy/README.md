## LedgerLoop Planner

LedgerLoop now acts as a portfolio-ready cashflow studio where freelancers and founders can connect live data, automate savings, and rehearse upcoming moves without spreadsheets.

### Experience Highlights
- **Forecast cockpit** pulls account data from the API, runs cashflow projections, and visualizes runway deltas with sparklines.
- **Savings autopilot** lets you queue percentage-based rules per account and monitor their impact in real time.
- **Scenario studio** triggers backend forecasts for multiple horizons so you can test purchases, slow months, or tax resets.
- **Transaction logger & account onboarding** keep the demo grounded in realistic budget flows and make the app feel shippable.

### Running the demo
```sh
# at the workspace root:
npm run dev:ledger
```

The script boots the API and Expo dev server together. If Metro caching causes issues, re-run with:

```sh
npx expo start --clear --workspace @multiapps/budget-buddy
```

