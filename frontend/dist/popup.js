// popup.js for Touch Some Grass extension
// Move all popup logic here. If you had inline scripts in popup.html, paste them here.
// Example: Render a message in the popup

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = '<h2 style="text-align:center;">Touch Some Grass</h2>';
  }
});
