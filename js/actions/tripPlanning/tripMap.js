(() => {
  let map;
  let markerLayer;
  let routeLayer;

  const CLUSTER_COLORS = [
    "#e53e3e",
    "#dd6b20",
    "#d69e2e",
    "#38a169",
    "#319795",
    "#3182ce",
    "#5a67d8",
    "#805ad5",
    "#d53f8c",
    "#e53e3e",
    "#ed64a6",
    "#f6ad55",
    "#fbd38d",
    "#68d391",
    "#4fd1c5",
    "#63b3ed",
    "#7f9cf5",
    "#b794f4",
    "#f687b3",
    "#fc8181",
  ];

  function initMap() {
    map = L.map("map").setView([20, 0], 2); // neutral global view
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
      crossOrigin: true,
      tileSize: 512,
      zoomOffset: -1,
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    routeLayer = L.layerGroup().addTo(map);
  }

  function recenterToPoints(points) {
    if (!points || points.length === 0) return;
    const latlngs = points.map((p) => [p.lat, p.lon]);
    map.fitBounds(latlngs, { padding: [30, 30] });
  }

  function drawMarkers(points, isClustered = false) {
    markerLayer.clearLayers();
    if (!points || points.length === 0) return;

    points.forEach((p) => {
      const color = isClustered
        ? CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length]
        : "#3182ce";
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 6,
        fillColor: p.cluster === -1 ? "#718096" : color, // Gray for outliers
        color: "white",
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9,
      }).bindPopup(`<b>${p.name}</b><br>${p.address}`);
      markerLayer.addLayer(marker);
    });

    recenterToPoints(points);
  }

  function drawNumberedMarkers(points) {
    markerLayer.clearLayers();
    if (!points || points.length === 0) return;

    points.forEach((p, index) => {
      const numberIcon = L.divIcon({
        className: "number-icon",
        html: `<span>${index + 1}</span>`,
        iconSize: [24, 24],
      });

      const marker = L.marker([p.lat, p.lon], { icon: numberIcon }).bindPopup(
        `<b>${index + 1}. ${p.name}</b><br>${p.address}`
      );
      markerLayer.addLayer(marker);
    });
  }

  function drawRoutes(optimizedRoutes) {
    routeLayer.clearLayers();
    // Always use miles for display
    const unit = "miles";

    optimizedRoutes.forEach((route) => {
      if (route.points.length < 2) return;

      const latlngs = route.points.map((p) => [p.lat, p.lon]);
      const color = CLUSTER_COLORS[route.cluster % CLUSTER_COLORS.length];

      // Calculate actual distance of the route line in miles
      const line = turf.lineString(route.points.map((p) => [p.lon, p.lat]));
      const distanceMiles = turf.length(line, { units: "miles" });

      // Store the calculated distance back on the route object for stats
      route.displayDistance = distanceMiles;

      const polyline = L.polyline(latlngs, {
        color: color,
        weight: 3,
        opacity: 0.8,
      }).bindPopup(
        `<b>Cluster ${
          parseInt(route.cluster, 10) + 1
        }</b><br>Distance: ${distanceMiles.toFixed(1)} ${unit}`
      );
      routeLayer.addLayer(polyline);

      // Add markers for ALL points in the route
      route.points.forEach((p, index) => {
        const isStart = index === 0;
        const isEnd = index === route.points.length - 1;

        let fillColor = "white";
        let radius = 6;

        if (isStart) {
          fillColor = "limegreen";
          radius = 8;
        } else if (isEnd) {
          fillColor = "red";
          radius = 8;
        } else {
          // Intermediate points use the cluster color
          fillColor = color;
        }

        L.circleMarker([p.lat, p.lon], {
          radius: radius,
          fillColor: fillColor,
          color: "white",
          weight: 2,
          fillOpacity: 1,
        })
          .addTo(routeLayer)
          .bindPopup(
            `<b>${index + 1}. ${p.name}</b><br>${p.address}<br>Cluster: ${
              parseInt(route.cluster, 10) + 1
            }`
          );
      });
    });
    if (optimizedRoutes.length > 0) {
      const allPoints = optimizedRoutes.flatMap((route) => route.points);
      recenterToPoints(allPoints);
    }
  }

  function updateClusterList(points) {
    const container = document.getElementById("clusterList");
    container.innerHTML = "";
    document.getElementById("clusterListContainer").style.display = "block";

    const clusters = {};
    points.forEach((p) => {
      const clusterId =
        p.cluster === -1 ? "Outliers" : `Cluster ${p.cluster + 1}`;
      if (!clusters[clusterId]) {
        clusters[clusterId] = { members: [], id: p.cluster };
      }
      clusters[clusterId].members.push(p);
    });

    Object.keys(clusters)
      .sort((a, b) =>
        a === "Outliers"
          ? 1
          : b === "Outliers"
          ? -1
          : a.localeCompare(b, undefined, { numeric: true })
      )
      .forEach((key) => {
        const cluster = clusters[key];
        const color =
          cluster.id === -1
            ? "#718096"
            : CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length];

        // Split members into two columns
        const mid = Math.ceil(cluster.members.length / 2);
        const col1Members = cluster.members.slice(0, mid);
        const col2Members = cluster.members.slice(mid);

        const col1Html = col1Members.map((m) => `<li>${m.name}</li>`).join("");
        const col2Html = col2Members.map((m) => `<li>${m.name}</li>`).join("");

        const item = document.createElement("div");
        item.className = "cluster-item";
        item.innerHTML = `
        <div class="cluster-header">
          <div class="cluster-color" style="background:${color};"></div>
          <div class="cluster-title">${key} (${cluster.members.length} members)</div>
        </div>
        <div class="cluster-members">
          <ul>${col1Html}</ul>
          <ul>${col2Html}</ul>
        </div>
      `;
        container.appendChild(item);
      });
  }

  // Expose for testing and module usage
  window.tripMap = {
    initMap,
    recenterToPoints,
    drawMarkers,
    drawNumberedMarkers,
    drawRoutes,
    updateClusterList,
    // Expose getters for testing
    getMap: () => map,
    getMarkerLayer: () => markerLayer,
    getRouteLayer: () => routeLayer,
    CLUSTER_COLORS,
  };
})();
