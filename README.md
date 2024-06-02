# React-based UI in Wonderland Engine

[![Build & Test](https://github.com/WonderlandEngine/wonderland-react-ui/actions/workflows/npm-build.yml/badge.svg)](https://github.com/WonderlandEngine/wonderland-react-ui/actions/workflows/npm-build.yml)
[![NPM Package][npm]](https://www.npmjs.com/package/@wonderlandengine/react-ui)
[![NPM Downloads][npm-downloads]](https://img.shields.io/npm/dw/@wonderlandengine/react-ui)
[![Discord][discord]](https://discord.wonderlandengine.com)

Performant react-based 3D UI. Write your UI code with declarative React-based Syntax and render to
[Wonderland Engine](https://wonderlandengine.com/) at the speed of light.

[Live Example](https://wonderlandengine.github.io/wonderland-react-ui)

## Setup

1. Ensure your project `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    ...
    "jsx": "react"
  },
  ...
}
```
2. Ensure you have `--external:yoga-layout` in "Views > Project Settings > esbuildFlagsEditor"


## Production Notes

Make sure to add `--minify` in your `edbuildFlags` when building production applications.

## State

This library is in an early development stage. It has nowhere near the widget library you would expect from
a complete component library nor API stability to ensure that future versions do not require changes to your code.

We are grateful for contributions!

## Components

The following widgets/components are currently available:

### Button

```jsx
<Button
    onClick={() => console.log("Clicked!")}
    material={panelMat}
    materialHovered={panelMatHovered}
    padding={20}
>
    <Text text={"Click Me!"} />
</Button>
```

### Text

```jsx
<Text text={"Click Me!"} fontSize={20} />
```

### Panel

Panel rendered as a rectangle with rounded corners:

```jsx
<Panel
    material={panelMat}
    rounding={10}
    resolution={8}
    width="80%"
    height="100%"
>
    {/* ... */}
</Panel>
```

### Column

Flex-box column:

```jsx
<Column rowGap={10}>
    {/* ... */}
</Column>
```

### Row

Flex-box row:

```jsx
<Row columnGap={10}>
    {/* ... */}
</Row>
```

### ProgressBar

```jsx
<ProgressBar value={health/maxHealth}>
    <Text text={`Health: ${health} / ${maxHealth}`} />
</ProgressBar>
```

### Plane

Simple plane mesh:

```jsx
<Plane width={100} height={100} material={coinIconTextureMat} mesh={planeMesh}>
</Plane>
```

[npm]: https://img.shields.io/npm/v/@wonderlandengine/react-ui
[npm-downloads]: https://img.shields.io/npm/dw/@wonderlandengine/react-ui
[discord]: https://img.shields.io/discord/669166325456699392
