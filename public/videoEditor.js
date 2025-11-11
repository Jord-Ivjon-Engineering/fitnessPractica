const exercises = [];

const nameInput = document.getElementById('exerciseName');
const startInput = document.getElementById('startTime');
const durationInput = document.getElementById('duration');
const addBtn = document.getElementById('addExercise');
const processBtn = document.getElementById('processVideo');
const videoInput = document.getElementById('videoInput');
const list = document.getElementById('exerciseList');
const resultDiv = document.getElementById('result');

addBtn.onclick = () => {
  const name = nameInput.value.trim();
  const start = parseInt(startInput.value, 10);
  const duration = parseInt(durationInput.value, 10);

  if (!name || Number.isNaN(start) || Number.isNaN(duration) || start < 0 || duration <= 0) {
    alert('Please fill all fields correctly (name, non-negative start, positive duration).');
    return;
  }

  exercises.push({ name, start, duration });

  const item = document.createElement('div');
  item.className = 'exercise-item';
  item.textContent = `${name} (${start}s - ${start + duration}s)`;
  list.appendChild(item);

  nameInput.value = '';
  startInput.value = '';
  durationInput.value = '';
};

processBtn.onclick = async () => {
  const file = videoInput.files[0];
  if (!file) {
    alert('Please upload a video.');
    return;
  }

  const formData = new FormData();
  formData.append('video', file);
  formData.append('exercises', JSON.stringify(exercises));

  // UI feedback
  processBtn.disabled = true;
  addBtn.disabled = true;
  resultDiv.textContent = 'Processing video...';

  try {
    const response = await fetch('http://localhost:3000/video/edit', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      // try to parse JSON error message if present
      let errMsg = `Server error: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) errMsg = `Error: ${errJson.error}`;
      } catch (e) { /* ignore JSON parse error */ }
      resultDiv.textContent = errMsg;
      return;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data && data.file) {
        // Server returned a path to the processed file. Make sure server serves it statically.
        const fileUrl = `http://localhost:3000/${data.file.replace(/^\/+/, '')}`;
        resultDiv.innerHTML = `<p>Video processed successfully!</p>
                               <a href="${fileUrl}" target="_blank" rel="noopener">Download Edited Video</a>`;
      } else {
        resultDiv.textContent = 'Processing finished but server returned unexpected JSON.';
      }
    } else {
      // Server returned the file directly (video or binary)
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // try to infer filename from response headers or fallback
      const cd = response.headers.get('content-disposition') || '';
      const match = cd.match(/filename="?([^"]+)"?/);
      a.download = match ? match[1] : 'edited_video';
      a.textContent = 'Download Edited Video';
      a.style.display = 'inline-block';
      a.style.marginTop = '8px';
      resultDiv.innerHTML = '<p>Video processed successfully!</p>';
      resultDiv.appendChild(a);
    }
  } catch (error) {
    console.error(error);
    resultDiv.textContent = 'Error connecting to server.';
  } finally {
    processBtn.disabled = false;
    addBtn.disabled = false;
  }
};