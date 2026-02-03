    window.switchModel = function(type) {
        const viewer = document.getElementById('main-model-viewer');

        if (!viewer) {
            console.error('Model nebyl nalezen');
            return;
        }

        if (type === 'historic') {
            viewer.src = 'Svihov.gltf';
        } else if (type === 'present') {
            viewer.src = 'Model_final.glb';
        }
    }

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // MAP INITIALIZATION
    // ==========================================
    const map = L.map('map-container', {
        zoomControl: false,
        maxZoom: 50,
        minZoom: 1
    }).fitBounds([
        [49.477587, 13.282005],
        [49.480401, 13.288819]
    ]);

    // Zoom control
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Attribution
    map.attributionControl.setPrefix(
        '<a href="https://leafletjs.com">Leaflet</a> · <a href="https://cuzk.gov.cz">ČÚZK</a>'
    );

    // ==========================================
    // BASE MAPS (TOP LEFT)
    // ==========================================
    const base_Ortofoto = L.tileLayer.wms(
        "https://ags.cuzk.gov.cz/arcgis1/services/ORTOFOTO/MapServer/WMSServer",
        { layers: "0", format: "image/png", transparent: true, attribution: "© ČÚZK" }
    );

    const base_OSM = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: "© OpenStreetMap" }
    );

    const base_ZTM5 = L.tileLayer.wms(
        "https://ags.cuzk.gov.cz/arcgis1/services/ZTM/ZTM5/MapServer/WMSServer",
        { layers: "0", format: "image/png", transparent: false, version: "1.3.0", attribution: "© ČÚZK ZTM5" }
    );

    // Default base layer
    base_Ortofoto.addTo(map);

    // ==========================================
    // IMAGE OVERLAYS (TOP RIGHT)
    // ==========================================
    const overlay_Svihov_1 = L.imageOverlay(
        "images/Svihov_GEO_1.png",
        [[49.4777197644107, 13.283334729287251], [49.48010851901164, 13.287223095211024]],
        { opacity: 0.7 }
    );

    const overlay_Svihov_2 = L.imageOverlay(
        "images/Svihov_GEO_2.png",
        [[49.4771271133187653, 13.2825610036692296], [49.4806171149280942, 13.2883428549269347]],
        { opacity: 0.7 }
    );

    // ==========================================
    // WMS OVERLAYS (TOP LEFT)
    // ==========================================
    const overlay_KN = L.tileLayer.wms(
        "https://services.cuzk.gov.cz/wms/wms.asp",
        { layers: "KN", format: "image/png", transparent: true, version: "1.3.0", crs: L.CRS.EPSG5514, attribution: "© ČÚZK KN" }
    );

    const overlay_Vrstevnice = L.tileLayer.wms(
        "https://ags.cuzk.gov.cz/arcgis/services/ZABAGED_VRSTEVNICE/MapServer/WMSServer",
        { layers: "0,1,2,3", format: "image/png", transparent: true, version: "1.3.0", attribution: "© ČÚZK – Vrstevnice" }
    );

    // ==========================================
    // LAYER CONTROLS
    // ==========================================

    // TOP LEFT: Base maps + KN + Vrstevnice
    L.control.layers(
        { "Ortofoto ČÚZK": base_Ortofoto, "OpenStreetMap": base_OSM, "ZTM5 ČÚZK": base_ZTM5 },
        { "Katastrální mapa (KN)": overlay_KN, "Vrstevnice": overlay_Vrstevnice },
        { position: "topleft", collapsed: false }
    ).addTo(map);

    // TOP RIGHT: Images only
    const overlaysRight = {
        "Historický půdorysný plán": overlay_Svihov_1,
        "Císařské otisky": overlay_Svihov_2
    };
    const imageControl = L.control.layers(null, overlaysRight, { position: 'topright', collapsed: false });
    imageControl.addTo(map);

    // ==========================================
    // ADD OPACITY SLIDERS UNDER IMAGE NAMES
    // ==========================================
    function addOpacitySlidersToLayerControl(control, overlays) {
        setTimeout(() => { // ensure DOM exists
            const container = control.getContainer();
            const labels = container.querySelectorAll('label');

            labels.forEach(label => {
                const overlayName = label.innerText.trim();
                const overlay = overlays[overlayName];

                if (overlay) {
                    // Create slider
                    const slider = document.createElement('input');
                    slider.type = 'range';
                    slider.min = 0;
                    slider.max = 1;
                    slider.step = 0.01;
                    slider.value = overlay.options.opacity || 0.7;
                    slider.style.width = '165px';
                    slider.style.display = 'block';
                    slider.style.marginTop = '2px';

                    slider.oninput = () => overlay.setOpacity(parseFloat(slider.value));

                    // Append slider under overlay name
                    label.appendChild(slider);
                }
            });
        }, 100);
    }

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems },
        draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            circle: false,
            marker: false,
            circlemarker: false
        }
    });
    map.addControl(drawControl);

    // Event to handle creation
    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);

        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            const distance = L.GeometryUtil.length(layer);
            alert(`Distance: ${distance.toFixed(2)} meters`);
        } else if (layer instanceof L.Polygon) {
            const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            alert(`Area: ${area.toFixed(2)} m²`);
        }
        });

    // Call function to attach sliders
    addOpacitySlidersToLayerControl(imageControl, overlaysRight);


    // ==========================================
    // --- 2. POTREE SECTION (Point Clouds) ---
    // ==========================================
    
    // Check if Potree is loaded
    if (typeof Potree !== 'undefined') {
        try {
            // Initialize Potree Viewer
            const viewer = new Potree.Viewer(document.getElementById("potree_render_area"));

            viewer.setEDLEnabled(true);
            viewer.setFOV(60);
            viewer.setPointBudget(1 * 1000 * 1000); // Adjust budget based on performance
            viewer.loadSettingsFromURL();
            
            viewer.setDescription("Point Cloud Viewer");
            
            viewer.loadGUI(() => {
                viewer.setLanguage('en');
                // Hide some menu items to keep it simple for this single page view
                $("#menu_tools").next().hide();
                $("#menu_clipping").next().hide();
            });

            // Function to swap point clouds
            // NOTE: We are using public Potree demo examples here. 
            // You must replace the URLs with paths to your own generated Potree datasets (cloud.js file).
            window.loadPointCloud = (modelType) => {
                viewer.scene.pointclouds.forEach(pc => viewer.scene.scenePointCloud.remove(pc));
                
                let url = "";
                if (modelType === 'lion') {
                     // Public example: Lion
                     url = "http://5.9.65.151/mschuetz/potree/resources/pointclouds/lion_takanawa/cloud.js";
                } else {
                     // Public example: Matterhorn
                     url = "http://5.9.65.151/mschuetz/potree/resources/pointclouds/matterhorn/cloud.js";
                }

                Potree.loadPointCloud(url, modelType, e => {
                    let scene = viewer.scene;
                    let pointcloud = e.pointcloud;
                    
                    let material = pointcloud.material;
                    material.size = 1;
                    material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
                    material.shape = Potree.PointShape.SQUARE;
                    
                    scene.addPointCloud(pointcloud);
                    // Move camera to fit the point cloud
                    viewer.fitToScreen();
                });
            }

            // Load default initially
            loadPointCloud('lion');
        } catch (error) {
            console.error('Error initializing Potree:', error);
        }
    } else {
        console.error('Potree library not loaded');
    }


// ==========================================
// --- 3. PANORAMA SECTION (Pannellum) ---
// ==========================================

if (typeof pannellum !== 'undefined') {
    try {

        // --- 1. Define basic scenes with optional pitch per hotspot ---
        const scenesData = {
            Fly_1: {
                title: "Letecký pohled 1",
                panorama: "pano/Fly_1.png",
                hfov: 100,
                hotSpotYaws: { 
                    Fly_2: {yaw: -20, pitch: 0 }, 
                    Fly_3: { yaw: -40, pitch: 0 }, 
                    Fly_4: { yaw: -90, pitch: 0 },
                    Ground_1: { yaw: -127, pitch: -56 }, 
                    Ground_2: {yaw: -65, pitch: -56 }, 
                    Ground_3: { yaw: 0, pitch: -80 },
                    Ground_4: { yaw: 8, pitch: -47 },
                }
            },
            Fly_2: {
                title: "Letecký pohled 2",
                panorama: "pano/Fly_2.png",
                hfov: 100,
                hotSpotYaws: { 
                    Fly_1: { yaw: 180, pitch: 0 }, 
                    Fly_3: { yaw: 295, pitch: 0 }, 
                    Fly_4: { yaw: -135, pitch: 0 }, 
                    Ground_5: { yaw: 265, pitch: -75} 
                }
            },
            Fly_3: {
                title: "Letecký pohled 3",
                panorama: "pano/Fly_3.png",
                hfov: 100,
                hotSpotYaws: { 
                    Fly_1: { yaw: 150, pitch: 0 }, 
                    Fly_2: { yaw: 130, pitch: 0 }, 
                    Fly_4: { yaw: 180, pitch: 0 }, 
                    Ground_4: { yaw: 116, pitch: -36 }, 
                    Ground_5: { yaw: 150, pitch: -38 } 
                }
            },
            Fly_4: {
                title: "Letecký pohled 4",
                panorama: "pano/Fly_4.png",
                hfov: 100,
                hotSpotYaws: { 
                    Fly_1: { yaw: 97, pitch: 0 }, 
                    Fly_2: { yaw: 45, pitch: 0 }, 
                    Fly_3: { yaw: 5, pitch: 0 }, 
                    Ground_1: { yaw: 129, pitch: -52 }, 
                    Ground_2: { yaw: 75, pitch: -58 }
                }
            },
            Ground_1: {
                title: "Prohlídka 1",
                panorama: "pano/Walk_1.png",
                hfov: 100,
                hotSpotYaws: { 
                    Fly_1: { yaw: 45, pitch: 60 }, 
                    Fly_2: { yaw: 110, pitch: 0 }, 
                    Fly_3: { yaw: -90, pitch: 0 }, 
                    Fly_4: { yaw: -65, pitch: 60 }, 
                    Ground_2: { yaw: 5, pitch: 0 }
                }
            },
            Ground_2: {
                title: "Prohlídka 2",
                panorama: "pano/Walk_2.png",
                hfov: 100,
                hotSpotYaws: { 
                    Fly_1: { yaw: 101, pitch: 65 }, 
                    Fly_4: { yaw: -80, pitch: 65 }, 
                    Ground_1: { yaw: 178, pitch: 6 }, 
                    Ground_3: { yaw: 95, pitch: 3 }, 
                    Ground_5: { yaw: 9, pitch: -3 } 
                }
            },
            Ground_3: {
                title: "Prohlídka 3",
                panorama: "pano/Walk_3.png",
                hfov: 100,
                hotSpotYaws: { 
                    Fly_1: { yaw: -95, pitch: 82 }, 
                    Ground_2: { yaw: -89, pitch: -1}, 
                    Ground_4: { yaw: 5, pitch: -5 } 

                }
            },
            Ground_4: {
                title: "Prohlídka 4",
                panorama: "pano/Walk_4.png",
                hfov: 100,
                hotSpotYaws: { 
                    Fly_1: { yaw: 188, pitch: 35 }, 

                    Fly_3: { yaw: -66, pitch: 35 }, 
                    Ground_3: { yaw: 188, pitch: 7 }
                }
            },
            Ground_5: {
                title: "Prohlídka 5",
                panorama: "pano/Walk_5.png",
                hfov: 100,
                hotSpotYaws: { 
                    Fly_2: { yaw: 20, pitch: 70 }, 
                    Fly_3: { yaw: -40, pitch: 50 }, 
                    Ground_2: { yaw: 178, pitch: 7 } 
                }
            }
        };

        // --- 2. Generate hotSpots from the yaw list ---
        for (let from in scenesData) {
            scenesData[from].hotSpots = [];
            const hotSpotYaws = scenesData[from].hotSpotYaws;
            for (let to in hotSpotYaws) {
                scenesData[from].hotSpots.push({
                    pitch: hotSpotYaws[to].pitch,
                    yaw: hotSpotYaws[to].yaw,
                    type: "scene",
                    text: scenesData[to].title,
                    sceneId: to
                });
            }
            delete scenesData[from].hotSpotYaws; // remove helper property
        }

        // --- 3. Initialize Pannellum ---
        pannellum.viewer('panorama-container', {
            "default": {
                "firstScene": "Ground_1",
                "author": "Filip Roučka",
                "sceneFadeDuration": 1000
            },
            "scenes": scenesData
        });

    } catch (error) {
        console.error('Problém při inicializaci knihovny Pannellum:', error);
    }
} else {
    console.error('Knihovna Pannellum nebyla načtena');
}

});
