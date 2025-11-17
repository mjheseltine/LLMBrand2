let selectedModel = null;
let stage = 1;

const app = document.getElementById("app");
const QUESTION_TEXT = "In the 2020 Presidential election, President Biden won the popular vote by exactly how many votes?";

// Fake responses per model (can be changed later)
const fakeResponses = {
    A: "Based on the search results, Joe Biden won the 2020 popular vote by exactly 7,060,140 votes. Biden received 81,283,098 votes while Trump received 74,222,958 votes.",
    B: "Joe Biden won the popular vote in the 2020 U.S. presidential election by 7,059,526 votes (81,283,501 votes for Biden versus 74,223,975 for Donald Trump).",
    C: "Joe Biden won the 2020 U.S. presidential popular vote by exactly 7,052,770 votes, receiving 81,283,501 to Donald Trump’s 74,230,731, according to the final certified results reported by the Federal Election Commission (FEC). The FEC’s official 2020 general election totals list Biden at 81,283,501 votes (51.3%) and Trump at 74,230,731 (46.8%), yielding a margin of 7,052,770. Note: Claims about “excess” votes or fraud do not change the certified national popular vote totals used here.[1]",
    D: "Reports indicate Biden won the popular vote by somewhere around 7 million votes."
};

function renderPage1() {
    app.innerHTML = `
        <h2>Instructions</h2>
        <p>
        We would now like you to actively use the AI agents to seek out information.
        We will ask you some factual questions and for every question that you answer correctly you will receive an additional bonus.
        You are free to ask the model anything that you think will be helpful in answering these questions, but you must only choose one model to ask.
        The models presented here are the same as the models used in the previous task.
        </p>

        <h3>First, select which of the models you would like to use:</h3>

        <div class="model-choice" data-model="A">Model A</div>
        <div class="model-choice" data-model="B">Model B</div>
        <div class="model-choice" data-model="C">Model C</div>
        <div class="model-choice" data-model="D">Model D</div>
    `;

    document.querySelectorAll(".model-choice").forEach(box => {
        box.addEventListener("click", () => {
            selectedModel = box.dataset.model;

            // send selection to Qualtrics
            window.parent.postMessage({
                type: "task2_model_chosen",
                value: selectedModel
            }, "*");

            renderPage2();
        });
    });
}

function renderPage2() {
    stage = 2;
    app.innerHTML = `
        <h2>Ask the Model</h2>
        <p><strong>Question:</strong> ${QUESTION_TEXT}</p>

        <div id="chat"></div>

        <div class="chat-box">
            <input type="text" id="userInput" placeholder="Type your prompt to the model..." />
            <button id="sendBtn">Send</button>
        </div>
    `;

    document.getElementById("sendBtn").addEventListener("click", () => {
        const msg = document.getElementById("userInput").value.trim();
        if (!msg) return;

        const chat = document.getElementById("chat");

        // Show user message
        chat.innerHTML += `<div class="chat-message chat-user">${msg}</div>`;

        // send prompt to Qualtrics
        window.parent.postMessage({
            type: "task2_prompt",
            value: msg
        }, "*");

        // Show generating
        chat.innerHTML += `<div class="chat-message chat-model">Generating...</div>`;

        // Fake delay
        setTimeout(() => {
            const modelAns = fakeResponses[selectedModel];

            // Remove generating
            const msgs = document.querySelectorAll(".chat-message.chat-model");
            msgs[msgs.length - 1].remove();

            // Show final answer
            chat.innerHTML += `<div class="chat-message chat-model">${modelAns}</div>`;

            // notify Qualtrics
            window.parent.postMessage({
                type: "task2_fakeAnswer",
                value: modelAns
            }, "*");

            // Add continue button
            app.innerHTML += `
                <button id="continueBtn">Continue</button>
            `;

            document.getElementById("continueBtn").addEventListener("click", renderPage3);

        }, 1000);
    });
}

function renderPage3() {
    stage = 3;
    app.innerHTML = `
        <h2>Your Final Answer</h2>
        <p>Please type your final answer below. Your bonus will be based on accuracy.</p>

        <input type="text" id="finalAnswer" placeholder="Your answer..." />
        <button id="submitFinal">Submit Answer</button>
    `;

    document.getElementById("submitFinal").addEventListener("click", () => {
        const answer = document.getElementById("finalAnswer").value.trim();
        if (!answer) return;

        // Send to Qualtrics
        window.parent.postMessage({
            type: "task2_finalAnswer",
            value: answer
        }, "*");

        // Allow Qualtrics Next button to appear
        window.parent.postMessage({ type: "task2_done" }, "*");

        app.innerHTML = `<h2>Thank you! You may now proceed.</h2>`;
    });
}

// Start
renderPage1();
