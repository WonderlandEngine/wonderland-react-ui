# React-based UI in Wonderland Engine

[![Build & Test](https://github.com/WonderlandEngine/wonderland-react-ui/actions/workflows/npm-build.yml/badge.svg)](https://github.com/WonderlandEngine/wonderland-react-ui/actions/workflows/npm-build.yml)
[![NPM Package][npm]](https://www.npmjs.com/package/@wonderlandengine/react-ui)
[![NPM Downloads][npm-downloads]](https://img.shields.io/npm/dw/@wonderlandengine/react-ui)
[![Discord][discord]](https://discord.wonderlandengine.com)

Performant react-based 3D UI. Write your UI code with declarative React-based Syntax and render to
[Wonderland Engine](https://wonderlandengine.com/) at the speed of light.

[Live Example](https://wonderlandengine.github.io/wonderland-react-ui)

![demo-gif](https://github.com/WonderlandEngine/wonderland-react-ui/blob/main/images/react-ui-image-small.gif)

## Setup

1. Ensure you are using Wonderland Editor 1.2+

2. Ensure your project `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    "jsx": "react"
  }
}
```
3. Ensure you have `--bundle` in "Views > Project Settings > esbuildFlagsEditor"

### Pipelines

You need three pipelines:

### UI Text

A `Text` pipeline with the following Depth settings:

![pipeline-settings-text](https://github.com/WonderlandEngine/wonderland-react-ui/blob/main/images/pipeline-settings-text.png)

### UI Color

A `Flat` pipeline with the following Depth settings:

![pipeline-settings](https://github.com/WonderlandEngine/wonderland-react-ui/blob/main/images/pipeline-settings.png)

### UI Color Textured

A copy of `UI Color`, with the `TEXTURED` feature enabled.


## Production Notes

Make sure to add `--minify` in your `esbuildFlags` when building production applications.

## State

This library is in an early development stage. It has nowhere near the widget library you would expect from
a complete component library nor API stability to ensure that future versions do not require changes to your code.

We are grateful for contributions!

## Components

The following widgets/components are currently available:

### MaterialContext.Provider

The ReactUIBase needs to know which materials/pipelines you would like to use as a base to create texts and panels.
This material will be cloned and its color updated based on the color properties of each component:

```ts
const materials: {
    panelMaterial?: Material | null;
    panelMaterialTextured?: Material | null;
    textMaterial?: Material | null;
};
```

Pass this as context to your app code:

```jsx
<MaterialContext.Provider value={materials}>
    {/* You app code */}
</MaterialContext.Provider>
```

### Button

```jsx
<Button
    onClick={() => console.log("Clicked!")}
    hovered={{
        backgroundColor: 0xff0000ff
    }}
    active={{
        backgroundColor: 0x00ff00ff
    }}
    padding={20}
>
    <Text>Click Me!</Text>
</Button>
```

### Text

```jsx
<Text fontSize={20}>Click Me!</Text>
```

### Panel

Panel rendered as a rectangle with rounded corners:

```jsx
<Panel
    backgroundColor={0xff00ffff}
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
    <Text>{`Health: ${health} / ${maxHealth}`}</Text>
</ProgressBar>
```

### Plane

Simple plane mesh:

```jsx
<Plane width={100} height={100} material={coinIconTextureMat} mesh={planeMesh} />
```

### Image

A `Panel`, but with a `src` property to load an image from a URL and display:

```jsx
<Image width={100} height={100} src="grumpy-cat.jpg" />
```

### Panel9Slice

A `Panel` with a 9-slice texture.

```jsx
<Panel9Slice width={100} height={100} texture={someNineSliceTexture} />
```


[npm]: https://img.shields.io/npm/v/@wonderlandengine/react-ui
[npm-downloads]: https://img.shields.io/npm/dw/@wonderlandengine/react-ui
[discord]: https://img.shields.io/discord/669166325456699392
