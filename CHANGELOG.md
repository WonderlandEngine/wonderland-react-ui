# Change Log

All notable changes to the *Wonderland React UI* library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2024-11-27

### Add

- Add support for React DevTools

## [0.2.0] - 2024-11-22

### Change

- [Breaking] Text alignment corrections. Note that this can make existing texts shift a bit. The following corrections are made:
  - Correct align text to the right
  - Text takes up the correct space based on height defined in the font (capHeight).
- Update example project

## [0.1.11] - 2024-11-21

### Change

- Fix an issue where the Yoga layout engine got loaded for each individual ReactUiBase component.
- Remove hardcoded values internally on progress bar and made the minimum length based on the rounding

### Add

- Add optional `dt` parameter to update method definition for ReactUiBase Component
