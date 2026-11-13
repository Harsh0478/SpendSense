# SpendSense design system — v0.1

## Direction

Purple fintech UI from the supplied app-screen reference, with clean white finance cards from the second reference. The supplied SpendSense mint/teal icon remains the brand mark; the application UI uses purple as the primary action color.

## Tokens

- Primary: `#8B4DFF`
- Primary deep: `#7136E8`
- Secondary: `#A66BFF`
- Light purple: `#F1E8FF`
- Soft lavender: `#F8F4FF`
- Background: `#FAF9FC`
- Surface: `#FFFFFF`
- Text: `#191625`
- Muted text: `#858091`
- Income: `#20B879`
- Expense: `#E66B75`
- Brand mint: `#5EEBC0`
- Brand deep teal: `#052F32`

## Navigation motion

Five evenly spaced destinations. The white floating capsule remains stationary; a 58 px raised circular dock travels between tab centers with a Reanimated spring. The active icon is white on the purple core. The bar and active dock are separate layers to recreate the animated raised active-tab treatment from the supplied video.

## Data integrity

Any amounts visible in the starter Home/Budget screens are explicitly illustrative preview values. They must be removed when live API data is wired. Real transactions must never be seeded into a user's account.
