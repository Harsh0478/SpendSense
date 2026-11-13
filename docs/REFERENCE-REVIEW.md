# Supplied visual reference review

## Image 1 — clean finance UI

Three white mobile surfaces show (1) balance and recent transactions, (2) monthly statistics with a line chart and top merchants, and (3) invoice creation. The build borrows the card density, typographic hierarchy, rounded white surfaces and restrained financial information layout; the invoice workflow itself is not part of the expense-tracker MVP.

## Image 2 — purple finance app screens

The reference includes onboarding, authentication, a purple monthly dashboard and a transaction list. It establishes the primary application palette and hierarchy: purple accent, pale lavender surfaces, readable dark typography, small category icons, and a docked bottom navigation.

## Image 3 — static bottom bar

A rounded dark capsule has four visible icons with a selected circular icon rising at the center. Its raised active item is a visual reference only; SpendSense retains the five destinations specified in the master prompt.

## Video — animated bottom bar

The 4.2-second MP4 shows a five-item bar in perspective. A circular active marker travels from one navigation slot to another. The bar's top contour appears to lift around the active marker, then settles as the previous item returns to the baseline. The active position changes horizontally with a smooth, spring-like motion. SpendSense implements the horizontal moving raised dock with a single Reanimated shared value, rather than five independent icon color animations.

## Files retained in this repository

- `references/clean-finance-ui.jpg`
- `references/purple-app-screens.jpg`
- `references/floating-navigation-still.jpg`
- `references/floating-navigation-animation.mp4`
