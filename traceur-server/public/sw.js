// Service worker minimal : sert uniquement à recevoir les rappels du jour
// pendant que l'appli n'est pas ouverte. Rien d'autre (pas de cache hors-ligne).
self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  var titre = data.titre || "Traceur";
  event.waitUntil(self.registration.showNotification(titre, {
    body: data.corps || "",
    tag: "traceur-rappel-jour",
  }));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
