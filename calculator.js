(function () {
  "use strict";

  const ANGLE_MODES = { DEG: "DEG", RAD: "RAD" };
  const PI = Math.PI;
  const E = Math.E;
  const MAX_DISPLAY_LENGTH = 16;
  const MAX_EXPRESSION_LENGTH = 80;

  const state = {
    expression: "",
    result: "0",
    angleMode: ANGLE_MODES.DEG,
    lastResult: null,
  };

  const elements = {
    expression: document.getElementById("expression"),
    result: document.getElementById("result"),
    angleMode: document.getElementById("angleMode"),
  };

  const hasUI = elements.expression && elements.result && elements.angleMode;

  function toRadians(deg) {
    return (deg * PI) / 180;
  }

  function angleArg(x) {
    return state.angleMode === ANGLE_MODES.DEG ? toRadians(x) : x;
  }

  function factorial(n) {
    if (n < 0 || n !== Math.floor(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
  }

  const TOKEN_TYPES = {
    NUMBER: "NUMBER",
    OP: "OP",
    UNARY: "UNARY",
    FUNC: "FUNC",
    LPAREN: "LPAREN",
    RPAREN: "RPAREN",
    CONST: "CONST",
  };

  const BINARY_OPS = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => (b === 0 ? NaN : a / b),
    "%": (a, b) => (b === 0 ? NaN : a % b),
    "^": (a, b) => (a < 0 && b !== Math.floor(b) ? NaN : Math.pow(a, b)),
  };

  const UNARY_FUNCS = {
    sin: (x) => Math.sin(angleArg(x)),
    cos: (x) => Math.cos(angleArg(x)),
    tan: (x) => Math.tan(angleArg(x)),
    asin: (x) => (state.angleMode === ANGLE_MODES.DEG ? (Math.asin(x) * 180) / PI : Math.asin(x)),
    acos: (x) => (state.angleMode === ANGLE_MODES.DEG ? (Math.acos(x) * 180) / PI : Math.acos(x)),
    atan: (x) => (state.angleMode === ANGLE_MODES.DEG ? (Math.atan(x) * 180) / PI : Math.atan(x)),
    log: (x) => (x <= 0 ? NaN : Math.log10(x)),
    ln: (x) => (x <= 0 ? NaN : Math.log(x)),
    sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)),
    square: (x) => x * x,
    negate: (x) => -x,
    reciprocal: (x) => (x === 0 ? NaN : 1 / x),
    factorial: (x) => factorial(x),
  };

  const CONSTANTS = { pi: PI, e: E, π: PI };

  function tokenize(str) {
    const tokens = [];
    let i = 0;
    const s = str.replace(/\s+/g, "");

    while (i < s.length) {
      if (/[0-9.]/.test(s[i])) {
        let num = "";
        while (i < s.length && /[0-9.]/.test(s[i])) {
          num += s[i++];
        }
        const n = parseFloat(num);
        if (isNaN(n) || num.split(".").length > 2) return null;
        tokens.push({ type: TOKEN_TYPES.NUMBER, value: n });
        continue;
      }

      if (/[a-zA-Zαπ]/.test(s[i])) {
        let id = "";
        while (i < s.length && /[a-zA-Zαπ]/.test(s[i])) {
          id += s[i++];
        }
        const idLower = id.toLowerCase();
        if (idLower === "pi" || id === "π") {
          tokens.push({ type: TOKEN_TYPES.CONST, value: PI });
        } else if (idLower === "e") {
          tokens.push({ type: TOKEN_TYPES.CONST, value: E });
        } else if (UNARY_FUNCS[idLower] !== undefined) {
          tokens.push({ type: TOKEN_TYPES.FUNC, value: idLower });
        } else {
          return null;
        }
        continue;
      }

      if (s[i] === "(") {
        tokens.push({ type: TOKEN_TYPES.LPAREN });
        i++;
        continue;
      }
      if (s[i] === ")") {
        tokens.push({ type: TOKEN_TYPES.RPAREN });
        i++;
        continue;
      }
      if ("+-*/%^".indexOf(s[i]) !== -1) {
        tokens.push({ type: TOKEN_TYPES.OP, value: s[i] });
        i++;
        continue;
      }
      return null;
    }
    return tokens;
  }

  function parse(tokens) {
    let pos = 0;

    function peek() {
      return pos < tokens.length ? tokens[pos] : null;
    }

    function consume() {
      return pos < tokens.length ? tokens[pos++] : null;
    }

    function parseExpr() {
      let left = parseTerm();
      if (left === null) return null;
      while (peek() && peek().type === TOKEN_TYPES.OP && "+-".indexOf(peek().value) !== -1) {
        const op = consume().value;
        const right = parseTerm();
        if (right === null) return null;
        left = BINARY_OPS[op](left, right);
        if (isNaN(left)) return NaN;
      }
      return left;
    }

    function parseTerm() {
      let left = parseFactor();
      if (left === null) return null;
      while (peek() && peek().type === TOKEN_TYPES.OP && "*/%^".indexOf(peek().value) !== -1) {
        const op = consume().value;
        const right = parseFactor();
        if (right === null) return null;
        left = BINARY_OPS[op](left, right);
        if (isNaN(left)) return NaN;
      }
      return left;
    }

    function parseFactor() {
      const unaryOps = [];
      while (peek() && (peek().type === TOKEN_TYPES.OP && peek().value === "-") || peek().type === TOKEN_TYPES.FUNC) {
        if (peek().type === TOKEN_TYPES.OP && peek().value === "-") {
          consume();
          unaryOps.push("negate");
        } else if (peek().type === TOKEN_TYPES.FUNC) {
          unaryOps.push(consume().value);
        }
      }

      let primary = null;
      const t = peek();
      if (!t) return null;

      if (t.type === TOKEN_TYPES.NUMBER) {
        primary = consume().value;
      } else if (t.type === TOKEN_TYPES.CONST) {
        primary = consume().value;
      } else if (t.type === TOKEN_TYPES.LPAREN) {
        consume();
        primary = parseExpr();
        if (primary === null) return null;
        if (!peek() || peek().type !== TOKEN_TYPES.RPAREN) return null;
        consume();
      } else if (t.type === TOKEN_TYPES.FUNC) {
        const fn = consume().value;
        if (!peek() || peek().type !== TOKEN_TYPES.LPAREN) return null;
        consume();
        const arg = parseExpr();
        if (arg === null) return null;
        if (!peek() || peek().type !== TOKEN_TYPES.RPAREN) return null;
        consume();
        primary = UNARY_FUNCS[fn](arg);
      } else {
        return null;
      }

      if (primary === null || isNaN(primary)) return primary;

      for (let i = unaryOps.length - 1; i >= 0; i--) {
        primary = UNARY_FUNCS[unaryOps[i]](primary);
        if (isNaN(primary)) return NaN;
      }

      return primary;
    }

    const result = parseExpr();
    if (result === null || (peek() && peek().type !== undefined)) return null;
    return result;
  }

  function evaluate(exprStr) {
    if (typeof exprStr !== "string" || !exprStr.trim()) return null;
    const tokens = tokenize(exprStr);
    if (!tokens || tokens.length === 0) return null;
    return parse(tokens);
  }

  function formatResult(value) {
    if (value === null || value === undefined || isNaN(value)) return null;
    if (!isFinite(value)) return null;
    const abs = Math.abs(value);
    if (abs >= 1e10 || (abs < 1e-6 && abs > 0)) {
      const exp = value.toExponential(6);
      return exp.replace(/(\.\d*?)0*e/, "$1e").replace(/e\+?/, "e");
    }
    const fixed = Number(value.toPrecision(MAX_DISPLAY_LENGTH));
    const str = String(fixed);
    if (str.length > MAX_DISPLAY_LENGTH && str.includes(".")) {
      return parseFloat(str).toFixed(MAX_DISPLAY_LENGTH - 1 - Math.floor(Math.log10(Math.abs(fixed)))).replace(/0+$/, "").replace(/\.$/, "");
    }
    return str.length > MAX_DISPLAY_LENGTH ? value.toExponential(6) : str;
  }

  function updateDisplay() {
    if (!hasUI) return;
    elements.expression.textContent = state.expression || "";
    elements.result.textContent = state.result;
    elements.result.classList.toggle("error", state.result === "Error" || state.result === "NaN");
    elements.angleMode.textContent = state.angleMode;
  }

  function appendToExpression(str) {
    if ((state.expression + str).length > MAX_EXPRESSION_LENGTH) return;
    state.expression += str;
    state.result = "0";
    updateDisplay();
  }

  function setResult(value, isError) {
    state.result = isError ? "Error" : value;
    state.lastResult = isError ? null : parseFloat(value);
    updateDisplay();
  }

  function applyUnary(symbol, fnName) {
    const expr = state.expression.trim();
    let num;
    if (expr.length === 0 && state.lastResult !== null) {
      num = state.lastResult;
    } else {
      const parsed = evaluate(expr);
      if (parsed === null || isNaN(parsed)) {
        setResult("Error", true);
        return;
      }
      num = parsed;
    }
    const result = UNARY_FUNCS[fnName](num);
    if (isNaN(result) || !isFinite(result)) {
      setResult("Error", true);
      return;
    }
    state.expression = "";
    state.lastResult = result;
    setResult(formatResult(result) || "Error");
  }

  function doEquals() {
    if (!state.expression.trim()) {
      if (state.lastResult !== null) state.result = formatResult(state.lastResult);
      updateDisplay();
      return;
    }
    const value = evaluate(state.expression);
    if (value === null) {
      setResult("Error", true);
      return;
    }
    if (isNaN(value) || !isFinite(value)) {
      setResult("Error", true);
      return;
    }
    state.lastResult = value;
    state.expression = "";
    setResult(formatResult(value));
  }

  function clear() {
    state.expression = "";
    state.result = "0";
    state.lastResult = null;
    updateDisplay();
  }

  function backspace() {
    if (state.expression.length === 0) {
      state.result = "0";
      state.lastResult = null;
    } else {
      state.expression = state.expression.slice(0, -1);
    }
    updateDisplay();
  }

  function handleAction(action) {
    const numKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    if (numKeys.includes(action)) {
      appendToExpression(action);
      return;
    }
    if (action === "decimal") {
      const lastNum = state.expression.match(/\d*\.?\d*$/);
      if (lastNum && lastNum[0].includes(".")) return;
      if (!/[\d.)]$/.test(state.expression) && state.expression.length > 0) appendToExpression("0");
      appendToExpression(".");
      return;
    }

    const opMap = { add: "+", subtract: "−", multiply: "×", divide: "÷", power: "^" };
    if (opMap[action]) {
      const sym = opMap[action];
      const normalized = sym === "−" ? "-" : sym === "×" ? "*" : sym === "÷" ? "/" : sym;
      if (state.expression.length === 0 && state.lastResult !== null) {
        state.expression = formatResult(state.lastResult) || String(state.lastResult);
      }
      if (/[+\-*/%^]$/.test(state.expression)) state.expression = state.expression.slice(0, -1);
      appendToExpression(normalized);
      return;
    }

    if (action === "percent") {
      if (state.expression.length === 0 && state.lastResult !== null) {
        state.expression = String(state.lastResult / 100);
      } else {
        const v = evaluate(state.expression);
        if (v !== null && !isNaN(v)) state.expression = String(v / 100);
      }
      state.result = "0";
      updateDisplay();
      return;
    }

    if (action === "openParen") appendToExpression("(");
    if (action === "closeParen") appendToExpression(")");
    if (action === "pi" || action === "π") appendToExpression("π");
    if (action === "e") appendToExpression("e");

    if (action === "sin") applyUnary("sin", "sin");
    if (action === "cos") applyUnary("cos", "cos");
    if (action === "tan") applyUnary("tan", "tan");
    if (action === "log") applyUnary("log", "log");
    if (action === "ln") applyUnary("ln", "ln");
    if (action === "sqrt") applyUnary("√", "sqrt");
    if (action === "square") applyUnary("x²", "square");
    if (action === "reciprocal") applyUnary("1/x", "reciprocal");
    if (action === "negate") applyUnary("±", "negate");
    if (action === "factorial") applyUnary("n!", "factorial");

    if (action === "clear") clear();
    if (action === "backspace") backspace();
    if (action === "equals") doEquals();
  }

  if (hasUI) {
    elements.angleMode.addEventListener("click", function () {
      state.angleMode = state.angleMode === ANGLE_MODES.DEG ? ANGLE_MODES.RAD : ANGLE_MODES.DEG;
      updateDisplay();
    });

    document.querySelectorAll(".keypad .btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const action = this.getAttribute("data-action");
        if (action) handleAction(action);
      });
    });

    document.addEventListener("keydown", function (e) {
      const key = e.key;
      if (key >= "0" && key <= "9") handleAction(key);
      if (key === ".") handleAction("decimal");
      if (key === "+") handleAction("add");
      if (key === "-") handleAction("subtract");
      if (key === "*") handleAction("multiply");
      if (key === "/") { e.preventDefault(); handleAction("divide"); }
      if (key === "Enter" || key === "=") { e.preventDefault(); handleAction("equals"); }
      if (key === "Backspace") { e.preventDefault(); handleAction("backspace"); }
      if (key === "Escape") handleAction("clear");
      if (key === "(") handleAction("openParen");
      if (key === ")") handleAction("closeParen");
      if (key === "%") handleAction("percent");
    });

    updateDisplay();
  }

  if (typeof window !== "undefined") {
    window.__calcEvaluate = function (expr, angleMode) {
      const prev = state.angleMode;
      if (angleMode) state.angleMode = angleMode;
      const out = evaluate(expr);
      state.angleMode = prev;
      return out;
    };
  }
})();

