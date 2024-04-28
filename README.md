# React-based UI in Wonderland Engine

## Setup

1. Ensure your project `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    ...
    "jsx": "react-jsx",
    "types": ["@types/**"]
  },
  ...
}
```
2. Ensure you have `--external:yoga-layout` in "Views > Project Settings > esbuildFlagsEditor"


## Notes

Make sure to add `--minify` in your `edbuildFlags` when building production applications.
