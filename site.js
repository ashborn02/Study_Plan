// Shared behaviour for every Study Hub page: nav highlight, lock button, sheet zone labels.
(function () {
  var UNLOCK_KEY = 'studyhub_unlock_v1';
  var page = location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.site-links a').forEach(function (link) {
    if (link.getAttribute('href') === page) link.setAttribute('aria-current', 'page');
  });

  // Forget the saved unlock key; the password gate shows again on reload.
  document.querySelectorAll('[data-lock]').forEach(function (button) {
    button.addEventListener('click', function () {
      try { localStorage.removeItem(UNLOCK_KEY); } catch (e) { /* ignore */ }
      try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) { /* ignore */ }
      location.reload();
    });
  });

  // Drawing-sheet zone references: numbers along the top, letters down the side.
  document.querySelectorAll('[data-zones]').forEach(function (sheet) {
    var cols = Number(sheet.dataset.zones) || 8;
    var rows = Number(sheet.dataset.zoneRows) || 6;
    var top = document.createElement('div');
    var left = document.createElement('div');
    top.className = 'zones zones-top';
    left.className = 'zones zones-left';
    top.setAttribute('aria-hidden', 'true');
    left.setAttribute('aria-hidden', 'true');
    for (var c = 1; c <= cols; c++) top.appendChild(Object.assign(document.createElement('span'), { textContent: c }));
    for (var r = 0; r < rows; r++) left.appendChild(Object.assign(document.createElement('span'), { textContent: String.fromCharCode(65 + r) }));
    sheet.appendChild(top);
    sheet.appendChild(left);
  });
})();
