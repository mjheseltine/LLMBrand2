let selectedModel = null;   // underlying slot A/B/C/D (what we record + what fakeResponses uses)
let stage = 1;
let generatedAnswer = null;

const app = document.getElementById("app");

const QUESTION_TEXT =
  "In the 2020 Presidential election, President Biden won the popular vote by exactly how many votes?";

const RESPONSE_MARGIN = "7,060,140";

/* --------------------------------------------------
   TASK 1 → TASK 2 CONSISTENCY
-------------------------------------------------- */

// What participants see / click (fixed order)
const COLOR_OPTIONS = [
  { label: "Purple model", className: "purple" },
  { label: "Blue model", className: "blue" },
  { label: "Orange model", className: "orange" },
  { label: "Green model", className: "green" }
];

// model_order received from Qualtrics (Task 1), e.g. "D,A,B,C"
let task1ModelOrder = null; // array like ["D","A","B","C"]

function timestamp() {
  return Date.now();
}

function requestModelOrderFromParent() {
  window.parent.postMessage({ type: "request_model_order" }, "*");
}

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  // Qualtrics should respond with: { type:"model_order_response", value:"D,A,B,C" }
  if (data.type === "model_order_response") {
    const raw = (data.value || "").trim();
    const parsed = raw.split(",").map(s => s.trim()).filter(Boolean);

    // basic validation: must be 4 slots containing A/B/C/D
    const ok =
      parsed.length === 4 &&
      parsed.every(x => ["A", "B", "C", "D"].includes(x));

    if (ok) {
      task1ModelOrder = parsed;
      console.log("Task 2 received model_order:", task1ModelOrder.join(","));
    } else {
      console.warn("Task 2 got invalid model_order_response:", data.value);
      task1ModelOrder = null;
    }
  }
});

function slotForColorIndex(i) {
  if (!task1ModelOrder) return null;
  return task1ModelOrder[i] || null;
}

/* --------------------------------------------------
   FIXED RESPONSE MAP (KEYED BY UNDERLYING SLOT)
-------------------------------------------------- */

const fakeResponses = {
  A: [
    `According to the official certified results, Joe Biden won the 2020 U.S. presidential election popular vote by exactly ${RESPONSE_MARGIN} votes.`,
    `Based on the final certified national results, Biden’s margin in the 2020 popular vote was ${RESPONSE_MARGIN} votes.`,
    `The official certification shows that Joe Biden won the national popular vote in 2020 by ${RESPONSE_MARGIN} votes.`
  ],
  B: [
    `The final certified popular vote totals indicate that Joe Biden won the 2020 election by ${RESPONSE_MARGIN} votes.`,
    `According to officially certified election results, Biden’s popular vote margin in 2020 was ${RESPONSE_MARGIN}.`,
    `Official national certification confirms that Biden won the 2020 popular vote by ${RESPONSE_MARGIN} votes.`
  ],
  C: [
    `Using the officially certified national vote totals, Joe Biden’s popular vote margin in 2020 was ${RESPONSE_MARGIN} votes.`,
    `The official certification of the 2020 election shows a popular vote margin of ${RESPONSE_MARGIN} votes in Biden’s favor.`,
    `Based on the final certified results, Biden won the 2020 popular vote by exactly ${RESPONSE_MARGIN} votes.`
  ],
  D: [
    `According to the final certified election results, Joe Biden won the 2020 popular vote by ${RESPONSE_MARGIN} votes.`,
    `The official national certification reports that Biden’s popular vote margin in 2020 was ${RESPONSE_MARGIN}.`,
    `Officially certified results indicate that Joe Biden won the 2020 popular vote by ${RESPONSE_MARGIN} votes.`
  ]
};

/* --------------------------------------------------
   PAGE 1 — INSTRUCTIONS + COLOR MODEL CHOICE
-------------------------------------------------- */

function renderPage1() {
  // request Task 1 mapping immediately (Qualtrics should respond quickly)
  requestModelOrderFromParent();

  app.innerHTML = `
    <h2>Instructions</h2>
    <p>
      In this task, you will use <strong>one AI model</strong> to help answer a factual question.
      <strong>You may only select one model</strong>, and you will not be able to change your choice.
    </p>
    <p>
      You may request advice from the model once. After reviewing its response, you will enter a final answer.
      <strong>You will receive a small bonus payment if you get the answer correct.</strong> Your bonus depends on accuracy.
    </p>

    <h3>Please select which model you would like to use:</h3>

    ${COLOR_OPTIONS.map((opt, i) => `
      <div class="model-choice ${opt.className}" data-color-index="${i}">
        ${opt.label}
      </div>
    `).join("")}
  `;

  document.querySelectorAll(".model-choice").forEach(box => {
    box.addEventListener("click", () => {
      const colorIndex = Number(box.dataset.colorIndex);
      const chosenLabel = COLOR_OPTIONS[colorIndex]?.label || "Model";

      // Map color -> underlying slot using Task 1 model_order
      const underlyingSlot = slotForColorIndex(colorIndex);

      // If model_order hasn't arrived yet, force a retry / block
      if (!underlyingSlot) {
        console.warn("Model order not ready yet — requesting again.");
        requestModelOrderFromParent();
        alert("Loading… please wait a moment and try again.");
        return;
      }

      selectedModel = underlyingSlot; // A/B/C/D

      console.log("Selected color:", chosenLabel, "→ underlying slot:", selectedModel);

      window.parent.postMessage(
        {
          type: "task2_model_chosen",
          value: selectedModel,         // A/B/C/D (consistent with Task 1)
          colorLabel: chosenLabel,      // "Purple model" etc. (optional but useful)
          timestamp: timestamp()
        },
        "*"
      );

      renderLoading(chosenLabel);
    });
  });
}

/* --------------------------------------------------
   LOADING SCREEN
-------------------------------------------------- */

function renderLoading(label) {
  app.innerHTML = `
    <h2>Loading ${label}</h2>
    <p>Please wait while the model is being prepared...</p>
    <div class="loader"></div>
  `;

  window.parent.postMessage(
    {
      type: "task2_model_loading",
      value: selectedModel,
      colorLabel: label,
      timestamp: timestamp()
    },
    "*"
  );

  setTimeout(renderPage2, 1200);
}

/* --------------------------------------------------
   PAGE 2 — ASK MODEL (UPDATED: wide button, highlighted question, no repeated question in chat)
-------------------------------------------------- */

function renderPage2() {
  stage = 2;

  app.innerHTML = `
    <h2>Ask the Model</h2>

    <div class="question-highlight">
      <strong>Question:</strong><br><br>
      ${QUESTION_TEXT}
    </div>

    <div id="chat"></div>

    <div class="chat-box">
      <button id="getAdviceBtn" style="width:100%; padding:14px; font-size:16px; border-radius:10px;">
        Get advice from the model
      </button>
    </div>
  `;

  const getAdviceBtn = document.getElementById("getAdviceBtn");
  const chat = document.getElementById("chat");

  getAdviceBtn.addEventListener("click", () => {
    // disable to prevent double clicks
    getAdviceBtn.disabled = true;
    getAdviceBtn.textContent = "Requesting…";

    // Send identical prompt log so Qualtrics sees the same question text as before
    window.parent.postMessage(
      {
        type: "task2_prompt",
        value: QUESTION_TEXT,
        model: selectedModel,
        timestamp: timestamp()
      },
      "*"
    );

    // Remove the button area after the one-turn request
    const box = document.querySelector(".chat-box");
    if (box) box.remove();

    // Show generating indicator
    chat.innerHTML += `<div class="chat-message chat-model">Generating…</div>`;

    setTimeout(() => {
      const responses = fakeResponses[selectedModel];

      if (!responses || responses.length === 0) {
        console.error("No responses found for model slot:", selectedModel);
        const msgs = document.querySelectorAll(".chat-message.chat-model");
        if (msgs.length) msgs[msgs.length - 1].textContent = "An error occurred.";
        return;
      }

      generatedAnswer = responses[Math.floor(Math.random() * responses.length)];

      // Remove the generating message and show only the model's answer (no user question repeated)
      const msgs = document.querySelectorAll(".chat-message.chat-model");
      if (msgs.length) msgs[msgs.length - 1].remove();
      chat.innerHTML += `<div class="chat-message chat-model">${generatedAnswer}</div>`;

      // Send the same fake-answer message for logging
      window.parent.postMessage(
        {
          type: "task2_fakeAnswer",
          value: generatedAnswer,
          model: selectedModel,
          timestamp: timestamp()
        },
        "*"
      );

      // Add continue button (keeps same flow)
      const continueBtn = document.createElement("button");
      continueBtn.id = "continueBtn";
      continueBtn.textContent = "Continue";
      continueBtn.addEventListener("click", renderPage3);
      app.appendChild(continueBtn);
    }, 1100);
  });
}

/* --------------------------------------------------
   PAGE 3 — FINAL ANSWER
-------------------------------------------------- */

function renderPage3() {
  stage = 3;

  app.innerHTML = `
    <h2>Your Final Answer</h2>
    <p>
      Below is the response provided by the model. Please type your final answer.
      Your bonus will be based on accuracy.
    </p>

    <div class="chat-message chat-model">${generatedAnswer || ""}</div>

    <input type="text" id="finalAnswer" placeholder="Your answer..." />
    <button id="submitFinal">Submit Answer</button>
  `;

  document.getElementById("submitFinal").addEventListener("click", () => {
    const answer = document.getElementById("finalAnswer").value.trim();
    if (!answer) return;

    window.parent.postMessage(
      {
        type: "task2_finalAnswer",
        value: answer,
        model: selectedModel,
        timestamp: timestamp()
      },
      "*"
    );

    window.parent.postMessage(
      {
        type: "task2_done",
        timestamp: timestamp()
      },
      "*"
    );

    app.innerHTML = `<h2>Thank you! You may now proceed. <br><br>Press advance below in Qualtrics.</h2>`;
  });
}

/* --------------------------------------------------
   START TASK
-------------------------------------------------- */

renderPage1();
