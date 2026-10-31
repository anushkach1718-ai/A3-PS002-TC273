

// CONSENTGUARD - FRONTEND + JAVA BACKEND

const API_BASE = "http://localhost:8080/api";
const USER_ID = "demo-user";
const NOTICE_VERSION = "1.0";

// Convert website purpose names into backend purpose names
function getPurposeCode(purpose) {
    const names = {
        "Service Provision": "SERVICE_PROVISION",
        "Information Processing": "INFORMATION_PROCESSING",
        "Third-Party Sharing": "THIRD_PARTY_SHARING"
    };

    return names[purpose] || purpose;
}

// Show consent status on the website
function updateCard(button, granted) {
    const card = button.closest(".consent-card");
    const status = card.querySelector(".status");

    button.textContent = granted
        ? "Withdraw Consent"
        : "Grant Consent";

    status.textContent = granted
        ? "Status: Granted"
        : "Status: Not Given";

    status.style.color = granted ? "#31966b" : "#817b91";
}

// Show audit logs from backend
async function loadAuditLogs() {
    const auditList = document.getElementById("auditList");

    try {
        const response = await fetch(`${API_BASE}/audit`);

        if (!response.ok) {
            throw new Error("Could not load audit logs");
        }

        const logs = await response.json();
        auditList.innerHTML = "";

        logs.slice().reverse().forEach(log => {
            const item = document.createElement("li");

            item.textContent =
                `${log.action} - ${log.purpose} - ${log.result} - ${log.timestamp}`;

            auditList.appendChild(item);
        });

    } catch (error) {
        console.error(error);
    }
}

// Load current consent status from backend
async function loadConsentStatus() {
    const buttons = document.querySelectorAll(".consent-btn");

    for (const button of buttons) {
        const purpose = getPurposeCode(button.dataset.purpose);

        try {
            const response = await fetch(
                `${API_BASE}/consent/status?userId=${USER_ID}&purpose=${encodeURIComponent(purpose)}`
            );

            const data = await response.json();
            updateCard(button, data.consentActive);

        } catch (error) {
            console.error("Could not load consent status:", error);
        }
    }

    await loadAuditLogs();
}

// Grant or withdraw consent through Java backend
document.querySelectorAll(".consent-btn").forEach(button => {

    button.addEventListener("click", async function () {

        const purpose = getPurposeCode(button.dataset.purpose);
        const card = button.closest(".consent-card");
        const status = card.querySelector(".status");

        const currentlyGranted =
            button.textContent.trim() === "Withdraw Consent";

        const endpoint = currentlyGranted
            ? "/consent/withdraw"
            : "/consent/grant";

        const body = {
            userId: USER_ID,
            purpose: purpose,
            noticeVersion: NOTICE_VERSION
        };

        button.disabled = true;

        try {
            const response = await fetch(API_BASE + endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok || data.message?.includes("No active")) {
                throw new Error(data.message || "Request failed");
            }

            updateCard(button, !currentlyGranted);
            status.textContent = currentlyGranted
                ? "Status: Withdrawn"
                : "Status: Granted";

            await loadAuditLogs();

        } catch (error) {
            alert("Backend error: " + error.message);
        } finally {
            button.disabled = false;
        }
    });
});

// Test data access through the backend
const testButton = document.getElementById("testAccessBtn");

testButton.addEventListener("click", async function () {

    const selectedPurpose =
        document.getElementById("purposeSelect").value;

    const purpose = getPurposeCode(selectedPurpose);
    const result = document.getElementById("accessResult");

    testButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/data/access`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: USER_ID,
                purpose: purpose
            })
        });

        const data = await response.json();

        result.textContent = data.accessGranted
            ? "ACCESS ALLOWED"
            : "ACCESS DENIED";

        result.style.color = data.accessGranted
            ? "#31966b"
            : "#d65c83";

        await loadAuditLogs();

    } catch (error) {
        result.textContent = "BACKEND CONNECTION FAILED";
        result.style.color = "#d65c83";
        console.error(error);
    } finally {
        testButton.disabled = false;
    }
});

// Load saved backend information when page opens
loadConsentStatus();
