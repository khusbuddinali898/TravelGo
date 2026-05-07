const API = "https://travelgo-backend-a5gne0hqh8d9c5dn.spaincentral-01.azurewebsites.net";

async function uploadMedia() {
  const file = document.getElementById("file").files[0];
  const userId = document.getElementById("userId").value;
  const description = document.getElementById("description").value;
  const destination = document.getElementById("destination").value;

  if (!file || !userId || !description || !destination) {
    alert("Please choose a file and fill all fields.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("description", description);
  formData.append("destination", destination);
  formData.append("userId", userId);

  const response = await fetch(`${API}/api/media`, {
    method: "POST",
    body: formData
  });

  if (response.ok) {
    alert("Media uploaded successfully!");
    document.getElementById("file").value = "";
    document.getElementById("userId").value = "";
    document.getElementById("description").value = "";
    document.getElementById("destination").value = "";
    loadMedia();
  } else {
    alert("Upload failed.");
  }
}

async function loadMedia() {
  const response = await fetch(`${API}/api/media`);
  const media = await response.json();

  const mediaList = document.getElementById("mediaList");
  mediaList.innerHTML = "";

  media.forEach(item => {
    const isVideo = item.contentType?.startsWith("video/");

    const mediaElement = isVideo
      ? `<video controls src="${item.url}"></video>`
      : `<img src="${item.url}" alt="${item.description}" />`;

    mediaList.innerHTML += `
      <div class="card">
        ${mediaElement}
        <div class="card-content">
          <h3>${item.destination}</h3>
          <p>${item.description}</p>
          <p><strong>User:</strong> ${item.userId}</p>
          <div class="actions">
            <button class="update" onclick="updateMedia('${item.id}')">Edit</button>
            <button class="delete" onclick="deleteMedia('${item.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  });
}

async function updateMedia(id) {
  const newDescription = prompt("Enter new description:");
  const newDestination = prompt("Enter new destination:");

  if (!newDescription || !newDestination) return;

  await fetch(`${API}/api/media/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: newDescription,
      destination: newDestination
    })
  });

  loadMedia();
}

async function deleteMedia(id) {
  if (!confirm("Are you sure you want to delete this post?")) return;

  await fetch(`${API}/api/media/${id}`, {
    method: "DELETE"
  });

  loadMedia();
}

loadMedia();