// ================================
// SnapStudy — App Logic
// ================================

document.addEventListener("DOMContentLoaded", () => {

  // --------------------------------
  // ELEMENTS
  // --------------------------------

  const modal = document.getElementById("addModal");
  const modalClose = document.querySelector(".modal-close");

  const addSchoolworkButton = document.querySelector(".add-schoolwork");
  const bottomAddButton = document.querySelector(".nav-add");

  const uploadOptions = document.querySelectorAll(".upload-option");
  const checkboxes = document.querySelectorAll(".checkbox");

  const taskCount = document.querySelector(".task-count");

  // --------------------------------
  // MODAL
  // --------------------------------

  function openModal() {
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  // Open from main button
  if (addSchoolworkButton) {
    addSchoolworkButton.addEventListener("click", openModal);
  }

  // Open from bottom navigation
  if (bottomAddButton) {
    bottomAddButton.addEventListener("click", openModal);
  }

  // Close button
  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }

  // Close by tapping outside modal
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  // --------------------------------
  // UPLOAD OPTIONS
  // --------------------------------

  uploadOptions.forEach((option) => {

    option.addEventListener("click", () => {

      const title =
        option.querySelector("strong")?.textContent || "";

      if (title === "Take a photo") {
        openCamera();
      }

      else if (title === "Choose image") {
        openImagePicker();
      }

      else if (title === "Upload PDF") {
        openPDFPicker();
      }

      else if (title === "Paste text") {
        openTextInput();
      }

    });

  });


  // --------------------------------
  // CAMERA
  // --------------------------------

  function openCamera() {

    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";

    input.addEventListener("change", () => {

      if (!input.files || !input.files[0]) {
        return;
      }

      handleFile(input.files[0]);

    });

    input.click();

  }


  // --------------------------------
  // IMAGE PICKER
  // --------------------------------

  function openImagePicker() {

    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";

    input.addEventListener("change", () => {

      if (!input.files || !input.files[0]) {
        return;
      }

      handleFile(input.files[0]);

    });

    input.click();

  }


  // --------------------------------
  // PDF PICKER
  // --------------------------------

  function openPDFPicker() {

    const input = document.createElement("input");

    input.type = "file";
    input.accept = "application/pdf";

    input.addEventListener("change", () => {

      if (!input.files || !input.files[0]) {
        return;
      }

      handleFile(input.files[0]);

    });

    input.click();

  }


  // --------------------------------
  // HANDLE FILE
  // --------------------------------

  function handleFile(file) {

    console.log("Selected file:", file.name);

    closeModal();

    showProcessingState(file);

    /*
      IMPORTANT:

      We are NOT sending the file to Gemini yet.

      Later this function will:

      1. Upload the image/PDF
      2. Send it to our backend
      3. Backend sends it to Gemini
      4. Gemini extracts assignments
      5. We save them to Supabase
      6. UI displays the real tasks
    */

  }


  // --------------------------------
  // PROCESSING STATE
  // --------------------------------

  function showProcessingState(file) {

    const card = document.querySelector(".priority-card");

    if (!card) return;

    const title = card.querySelector("h3");
    const subject = card.querySelector(".subject");
    const description = card.querySelector(".priority-details");

    if (subject) {
      subject.textContent = "SNAPSTUDY AI";
    }

    if (title) {
      title.textContent = "Analyzing your schoolwork…";
    }

    if (description) {
      description.innerHTML = `
        <div class="detail">
          <span class="detail-icon">🤖</span>
          <div>
            <small>File</small>
            <strong>${escapeHTML(file.name)}</strong>
          </div>
        </div>

        <div class="detail">
          <span class="detail-icon">⏳</span>
          <div>
            <small>Status</small>
            <strong>Processing</strong>
          </div>
        </div>

        <div class="detail">
          <span class="detail-icon">✦</span>
          <div>
            <small>AI</small>
            <strong>Reading</strong>
          </div>
        </div>
      `;
    }

  }


  // --------------------------------
  // PASTE TEXT
  // --------------------------------

  function openTextInput() {

    closeModal();

    const text = prompt(
      "Paste your school assignment, teacher message, or schoolwork here:"
    );

    if (!text || !text.trim()) {
      return;
    }

    handleText(text.trim());

  }


  function handleText(text) {

    console.log("Schoolwork text:", text);

    showTextProcessingState();

    /*
      Later:

      text → backend → Gemini → structured tasks
    */

  }


  function showTextProcessingState() {

    const card = document.querySelector(".priority-card");

    if (!card) return;

    const subject = card.querySelector(".subject");
    const title = card.querySelector("h3");

    if (subject) {
      subject.textContent = "SNAPSTUDY AI";
    }

    if (title) {
      title.textContent = "Understanding your assignment…";
    }

  }


  // --------------------------------
  // TASK CHECKBOXES
  // --------------------------------

  checkboxes.forEach((checkbox) => {

    checkbox.addEventListener("click", () => {

      const task = checkbox.closest(".task-card");

      if (!task) return;

      const alreadyCompleted =
        task.classList.contains("completed");

      if (alreadyCompleted) {

        task.classList.remove("completed");

        checkbox.innerHTML = "";

      } else {

        task.classList.add("completed");

        checkbox.innerHTML = "✓";

      }

      updateTaskCount();

    });

  });


  // --------------------------------
  // UPDATE TASK COUNT
  // --------------------------------

  function updateTaskCount() {

    const tasks = document.querySelectorAll(".task-card");

    const completed =
      document.querySelectorAll(".task-card.completed").length;

    const remaining = tasks.length - completed;

    if (taskCount) {

      taskCount.textContent =
        `${remaining} ${remaining === 1 ? "task" : "tasks"}`;

    }

  }


  // --------------------------------
  // NAVIGATION
  // --------------------------------

  const navItems =
    document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {

    item.addEventListener("click", () => {

      navItems.forEach((nav) => {
        nav.classList.remove("active");
      });

      item.classList.add("active");

    });

  });


  // --------------------------------
  // SEARCH
  // --------------------------------

  const searchButton =
    document.querySelector(".icon-button");

  if (searchButton) {

    searchButton.addEventListener("click", () => {

      const query = prompt("Search your schoolwork:");

      if (!query || !query.trim()) {
        return;
      }

      console.log(
        "Searching for:",
        query.trim()
      );

      alert(
        `Search will be connected to your tasks soon.\n\nYou searched for: ${query.trim()}`
      );

    });

  }


  // --------------------------------
  // START ASSIGNMENT
  // --------------------------------

  const startButton =
    document.querySelector(".primary-button");

  if (startButton) {

    startButton.addEventListener("click", () => {

      alert(
        "Assignment mode is coming next. 🚀"
      );

    });

  }


  // --------------------------------
  // VIEW ALL
  // --------------------------------

  const viewAllButton =
    document.querySelector(".view-all");

  if (viewAllButton) {

    viewAllButton.addEventListener("click", () => {

      alert(
        "Full calendar and assignment history are coming next."
      );

    });

  }


  // --------------------------------
  // PROFILE
  // --------------------------------

  const profileButton =
    document.querySelector(".profile-button");

  if (profileButton) {

    profileButton.addEventListener("click", () => {

      alert(
        "Profile settings are coming soon."
      );

    });

  }


  // --------------------------------
  // ESCAPE HTML
  // --------------------------------

  function escapeHTML(value) {

    const div =
      document.createElement("div");

    div.textContent = value;

    return div.innerHTML;

  }


  // --------------------------------
  // INITIAL STATE
  // --------------------------------

  updateTaskCount();

});
