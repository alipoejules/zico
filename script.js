const expressionEl = document.querySelector("[data-expression]");
const resultEl = document.querySelector("[data-result]");
const keypadEl = document.querySelector(".keypad");

const operators = new Set(["+", "-", "*", "/"]);
let expression = "";
let errorState = false;

function tokenize(input) {
  const tokens = [];
  let number = "";

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (/\d/.test(char) || char === ".") {
      number += char;
      continue;
    }

    if (number) {
      if ((number.match(/\./g) || []).length > 1) {
        throw new Error("Invalid number");
      }
      tokens.push(number);
      number = "";
    }

    if (operators.has(char) || char === "(" || char === ")") {
      const prevToken = tokens[tokens.length - 1];
      const isUnaryMinus =
        char === "-" &&
        (tokens.length === 0 || operators.has(prevToken) || prevToken === "(");

      if (isUnaryMinus) {
        number = "-";
        continue;
      }

      tokens.push(char);
      continue;
    }

    throw new Error("Invalid character");
  }

  if (number) {
    if ((number.match(/\./g) || []).length > 1 || number === "-") {
      throw new Error("Invalid number");
    }
    tokens.push(number);
  }

  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const stack = [];
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      output.push(token);
      continue;
    }

    if (operators.has(token)) {
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (!operators.has(top) || precedence[top] < precedence[token]) {
          break;
        }
        output.push(stack.pop());
      }
      stack.push(token);
      continue;
    }

    if (token === "(") {
      stack.push(token);
      continue;
    }

    if (token === ")") {
      let foundOpening = false;
      while (stack.length > 0) {
        const next = stack.pop();
        if (next === "(") {
          foundOpening = true;
          break;
        }
        output.push(next);
      }

      if (!foundOpening) {
        throw new Error("Mismatched parentheses");
      }
    }
  }

  while (stack.length > 0) {
    const token = stack.pop();
    if (token === "(" || token === ")") {
      throw new Error("Mismatched parentheses");
    }
    output.push(token);
  }

  return output;
}

function evaluateRpn(tokens) {
  const stack = [];

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      stack.push(Number(token));
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();

    if (left === undefined || right === undefined) {
      throw new Error("Invalid expression");
    }

    if (token === "+") {
      stack.push(left + right);
    } else if (token === "-") {
      stack.push(left - right);
    } else if (token === "*") {
      stack.push(left * right);
    } else if (token === "/") {
      if (right === 0) {
        throw new Error("Division by zero");
      }
      stack.push(left / right);
    }
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    throw new Error("Invalid expression");
  }

  return stack[0];
}

function evaluateExpression(input) {
  const trimmed = input.trim();

  if (!trimmed) {
    return "0";
  }

  const tokens = tokenize(trimmed);
  const rpn = toRpn(tokens);
  const value = evaluateRpn(rpn);

  return formatNumber(value);
}

function formatNumber(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  const rounded = Number(value.toFixed(10));
  return String(rounded);
}

function updateDisplay() {
  expressionEl.textContent = expression || "0";

  if (errorState) {
    resultEl.textContent = "Error";
    return;
  }

  try {
    resultEl.textContent = evaluateExpression(expression);
  } catch {
    resultEl.textContent = expression ? "..." : "0";
  }
}

function isValidNextChar(currentExpression, nextChar) {
  const lastChar = currentExpression.slice(-1);

  if (!currentExpression) {
    return /\d/.test(nextChar) || nextChar === "." || nextChar === "(" || nextChar === "-";
  }

  if (operators.has(nextChar)) {
    if (nextChar === "-" && (operators.has(lastChar) || lastChar === "(")) {
      return true;
    }
    return !operators.has(lastChar) && lastChar !== "(" && lastChar !== ".";
  }

  if (nextChar === ".") {
    const segment = currentExpression.split(/[+\-*/()]/).pop();
    return segment !== "" && !segment.includes(".");
  }

  if (nextChar === "(") {
    return operators.has(lastChar) || lastChar === "(";
  }

  if (nextChar === ")") {
    const openCount = (currentExpression.match(/\(/g) || []).length;
    const closeCount = (currentExpression.match(/\)/g) || []).length;
    return openCount > closeCount && !operators.has(lastChar) && lastChar !== "(" && lastChar !== ".";
  }

  if (/\d/.test(nextChar)) {
    return lastChar !== ")";
  }

  return false;
}

function appendValue(value) {
  if (errorState) {
    if (operators.has(value) || value === ")") {
      return;
    }
    expression = "";
    errorState = false;
  }

  if (value === "." && (expression === "" || expression.endsWith("(") || operators.has(expression.slice(-1)))) {
    expression += "0";
  }

  if (!isValidNextChar(expression, value)) {
    return;
  }

  expression += value;
  updateDisplay();
}

function clearAll() {
  expression = "";
  errorState = false;
  updateDisplay();
}

function deleteLast() {
  if (errorState) {
    clearAll();
    return;
  }

  expression = expression.slice(0, -1);
  updateDisplay();
}

function evaluateCurrent() {
  try {
    const result = evaluateExpression(expression);
    expression = result;
    errorState = false;
  } catch {
    errorState = true;
  }

  updateDisplay();
}

keypadEl.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) {
    return;
  }

  const { action, value } = target.dataset;

  if (action === "clear") {
    clearAll();
    return;
  }

  if (action === "delete") {
    deleteLast();
    return;
  }

  if (action === "evaluate") {
    evaluateCurrent();
    return;
  }

  if (value) {
    appendValue(value);
  }
});

window.addEventListener("keydown", (event) => {
  const { key } = event;

  if ((/\d/.test(key) || operators.has(key) || key === "." || key === "(" || key === ")") && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    appendValue(key);
    return;
  }

  if (key === "Enter" || key === "=") {
    event.preventDefault();
    evaluateCurrent();
    return;
  }

  if (key === "Backspace") {
    event.preventDefault();
    deleteLast();
    return;
  }

  if (key === "Escape") {
    event.preventDefault();
    clearAll();
  }
});

updateDisplay();
