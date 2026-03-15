# Scientific Calculator

A scientific calculator web app with basic arithmetic, scientific functions, constants, and keyboard support.

## Run

From this directory:

```bash
python3 -m http.server 8765
```

Then open **http://127.0.0.1:8765/** in your browser.

Or open `index.html` directly in a browser (file protocol).

## Test

Open **http://127.0.0.1:8765/test.html** (with the server running) to run the expression engine tests. You should see "All 18 tests passed."

## Features

- **Basic:** `+` `−` `×` `÷` `%` `^` (power), parentheses
- **Scientific:** `sin` `cos` `tan` `log` `ln` `√` `x²` `1/x` `n!` ±
- **Constants:** `π` `e`
- **Angle mode:** Click **DEG** / **RAD** to toggle (trig functions)
- **Keyboard:** digits, `+` `-` `*` `/` `%` `=` Enter, Backspace, Escape, `(` `)`

## Files

- `index.html` – Calculator UI
- `styles.css` – Layout and theme
- `calculator.js` – Expression parser and UI logic
- `test.html` – Engine tests (no UI)
