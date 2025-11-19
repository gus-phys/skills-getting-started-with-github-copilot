document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: simple HTML escaper to avoid injection
  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper: compute up to 2 initials from the part before @
  function getInitials(email) {
    try {
      const local = (email && String(email).split("@")[0]) || "";
      const parts = local.split(/[\W_]+/).filter(Boolean);
      if (parts.length === 0) return local.slice(0, 2).toUpperCase() || "?";
      const initials = parts
        .map((p) => p[0].toUpperCase())
        .slice(0, 2)
        .join("");
      return initials;
    } catch {
      return "?";
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear existing options except placeholder
      // Remove any previously added options (keep first placeholder)
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - (details.participants ? details.participants.length : 0);

        // Build participants section
        const participants = Array.isArray(details.participants) ? details.participants : [];
        let participantsHtml = "";
        if (participants.length) {
          participantsHtml = '<ul class="participants">';
          participants.forEach((p) => {
            const initials = getInitials(p);
            const displayName = escapeHtml(String(p).split("@")[0]);
            // Add delete icon (button) with data attributes
            participantsHtml += `<li class="participant-item"><span class="participant-badge">${escapeHtml(initials)}</span><span class="participant-name">${displayName}</span><button class="delete-participant" title="Remove" data-email="${escapeHtml(p)}" style="background:none;border:none;color:#c00;font-size:18px;cursor:pointer;margin-left:8px;" aria-label="Remove participant">&#128465;</button></li>`;
          });
          participantsHtml += "</ul>";
        } else {
          participantsHtml = '<p class="no-participants">No participants yet</p>';
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description || "")}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule || "")}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
  // Handle participant delete (unregister)
  activitiesList.addEventListener("click", async (event) => {
    if (event.target.classList.contains("delete-participant")) {
      const button = event.target;
      const email = button.getAttribute("data-email");
      // Find the activity name (from the closest .activity-card)
      const card = button.closest(".activity-card");
      const activityName = card ? card.querySelector("h4")?.textContent : null;
      if (!activityName || !email) return;
      if (!confirm(`Remove ${email} from ${activityName}?`)) return;
      try {
        const response = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, {
          method: "DELETE"
        });
        const result = await response.json();
        if (response.ok) {
          fetchActivities();
        } else {
          alert(result.detail || "Failed to remove participant.");
        }
      } catch (err) {
        alert("Error removing participant.");
      }
    }
  });
});
