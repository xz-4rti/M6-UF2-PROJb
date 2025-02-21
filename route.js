document.addEventListener('DOMContentLoaded', function () {
    const ccaaSelect = document.getElementById('ccaa');
    const provinciaSelect = document.getElementById('provincia');
    const poblacionSelect = document.getElementById('poblacion');
    const imageContainer = document.getElementById('image-container');
    const submitButton = document.getElementById('submit');

    // Cargar Comunitats Autònomes
    async function fetchComunidad() {
        let urlComunidad = 'https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/ccaa.json';
        let response = await fetch(urlComunidad);
        let comunidades = await response.json();

        for (let comunidad of comunidades) {
            const option = document.createElement('option');
            option.value = comunidad.code;  // Usar "code" como valor
            option.textContent = comunidad.label;  // Usar "label" como nombre visible
            ccaaSelect.appendChild(option);
        }
    }
    fetchComunidad();

    // Cargar Províncies en funció de la Comunitat Autònoma seleccionada
    async function fetchProvincia(selectedCCAA) {
        let urlProvincias = 'https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/provincias.json';
        let response = await fetch(urlProvincias);
        let data = await response.json();

        // Limpiar selects antes de agregar nuevas opciones
        provinciaSelect.innerHTML = '<option value="" disabled selected>Selecciona una opció</option>';
        poblacionSelect.innerHTML = '<option value="" disabled selected>Selecciona una opció</option>';

        let provinciasFiltradas = data.filter(provincia => provincia.parent_code === selectedCCAA);

        for (let provincia of provinciasFiltradas) {
            const option = document.createElement('option');
            option.value = provincia.code;
            option.textContent = provincia.label;
            provinciaSelect.appendChild(option);
        }
    }

    // Evento para cargar provincias cuando cambia la comunidad
    ccaaSelect.addEventListener('change', function () {
        fetchProvincia(this.value);
    });

    // Carregar Poblacions en funció de la Província seleccionada
    async function fetchPoblacions(selectedProvincia) {
        let urlPoblacion = 'https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/poblaciones.json';
        let response = await fetch(urlPoblacion);
        let poblacion = await response.json();

        let poblacionesFiltradas = poblacion.filter(poblacion => poblacion.parent_code === selectedProvincia);
        for (let poblacion of poblacionesFiltradas) {
            const option = document.createElement('option');
            option.value = poblacion.code;
            option.textContent = poblacion.label;
            poblacionSelect.appendChild(option);
        }
    }

    provinciaSelect.addEventListener('change', function () {
        fetchPoblacions(this.value);
    });

    // Obtener imágenes de Wikimedia
    async function fetchImagen(selected) {
        let urlImagen = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=images&titles=${encodeURIComponent(selected)}&gimlimit=10&prop=imageinfo&iiprop=url`;
        let response = await fetch(urlImagen);
        let data = await response.json();

        return data.query?.pages || {};
    }

    // Evento de envío del formulario para buscar imágenes
    submitButton.addEventListener('click', async function (event) {
        event.preventDefault();
        const selectedPoblacion = poblacionSelect.value;
        const poblacionNombre = poblacionSelect.options[poblacionSelect.selectedIndex]?.textContent || "";

        if (selectedPoblacion) {
            imageContainer.innerHTML = '<p>Carregant imatges...</p>';

            let images = await fetchImagen(poblacionNombre);
            imageContainer.innerHTML = ''; // Limpiar antes de agregar nuevas imágenes

            if (Object.keys(images).length > 0) {
                Object.values(images).forEach(image => {
                    if (image.imageinfo) {
                        const imageUrl = image.imageinfo[0].url;
                        const imageBox = document.createElement('div');
                        imageBox.className = 'image-box';
                        const imgElement = document.createElement('img');
                        imgElement.src = imageUrl;
                        imageBox.appendChild(imgElement);
                        imageContainer.appendChild(imageBox);
                    }
                });
            } else {
                imageContainer.innerHTML = '<p>No s\'han trobat imatges per a aquesta població.</p>';
            }
        } else {
            imageContainer.innerHTML = '<p>Selecciona una població per veure les imatges.</p>';
        }
    });

    // Function to show the modal with a message
    function showModal(message) {
        modal.style.display = 'block';
        modalMessage.textContent = message;
    }

    // Function to hide the modal
    function closeModal() {
        modal.style.display = 'none';
    }


    // TASCA 2 - Localització de l'usuari con geolocalització
    const locatebutton = document.createElement('button');
    locatebutton.innerHTML = "📍 Localizarme";
    locatebutton.id = "locate-me";
    document.body.appendChild(locatebutton);
    
    locatebutton.addEventListener('click', function () {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async function (position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // Utilizar una api geocodificacio inversa per obtener la población 
                let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                let data = await response.json();
                let ciutat = data.address.city || data.address.town || data.address.village;

                if (ciutat) {
                    alert(`S'ha detectat la teva ubicació: ${ciutat}. Buscant imatges...`);
                    let images = await fetchImagen(ciutat);
                    imageContainer.innerHTML = ''; // Limpiar antes de agregar nuevas imágenes

                    if (Object.keys(images).length > 0) {
                        Object.values(images).forEach(image => {
                            if (image.imageinfo) {
                                const imageUrl = image.imageinfo[0].url;
                                const imageBox = document.createElement('div');
                                imageBox.className = 'image-box';
                                const imgElement = document.createElement('img');
                                imgElement.src = imageUrl;
                                imageBox.appendChild(imgElement);
                                imageContainer.appendChild(imageBox);
                            }
                        });
                    } else {
                        imageContainer.innerHTML = '<p>No s\'han trobat imatges per a aquesta població.</p>';
                    }

                } else {
                    showModal("No s'ha pogut trobar la teva ciutat. Prova a seleccionar-la manualment.");
                }
            }, function (error) {
                showModal("No s'ha pogut obtenir la teva ubicació.");
            });
        } else {
            showModal("El teu navegador no suporta geolocalització.");
        }
    });

    // TASCA 2 - MAPA
    let map;
    let marker;

    async function fetchImagen2(city) {
        let urlImagen = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=file:${encodeURIComponent(city)}&gsrlimit=5&prop=imageinfo&iiprop=url`;
        
        try {
            let response = await fetch(urlImagen);
            let data = await response.json();
    
            // Ensure that the response contains images
            if (data.query?.pages) {
                return Object.values(data.query.pages);
            } else {
                return [];
            }
        } catch (error) {
            console.error("Error fetching images:", error);
            return [];
        }
    }
     

    // Initialize the Leaflet map
    function initMap() {
        map = L.map('map').setView([40.4168, -3.7038], 6); // Center on Spain
    
        // OpenStreetMap tiles
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
    
        // Esri Satellite Layer
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        });
    
        // Base layers control
        const baseLayers = {
            "OpenStreetMap": osmLayer,
            "Satellite": satelliteLayer
        };
    
        // Default layer
        osmLayer.addTo(map);
        L.control.layers(baseLayers).addTo(map);
    
        // Click event for map
        map.on('click', async function (event) {
            const lat = event.latlng.lat;
            const lng = event.latlng.lng;
    
            try {
                // Reverse geocode to get the city name
                let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                let data = await response.json();
                let city = data.address.city || data.address.town || data.address.village;
    
                if (city) {
                    alert(`Has seleccionado la población: ${city}. Buscando imágenes...`);
                    let images = await fetchImagen2(city);
                    
                    // Clear previous images
                    imageContainer.innerHTML = '';
    
                    if (Object.keys(images).length > 0) {
                        Object.values(images).forEach(image => {
                            if (image.imageinfo) {
                                const imageUrl = image.imageinfo[0].url;
                                const imageBox = document.createElement('div');
                                imageBox.className = 'image-box';
                                const imgElement = document.createElement('img');
                                imgElement.src = imageUrl;
                                imageBox.appendChild(imgElement);
                                imageContainer.appendChild(imageBox);
                            }
                        });
                    } else {
                        imageContainer.innerHTML = '<p>No s\'han trobat imatges per a aquesta població.</p>';
                    }
                } else {
                    alert("No se ha podido encontrar la población.");
                }
    
                // Place a marker on the clicked location
                if (marker) {
                    marker.setLatLng([lat, lng]);
                } else {
                    marker = L.marker([lat, lng]).addTo(map);
                }
            } catch (error) {
                console.error("Error fetching location:", error);
            }
        });
    }    
    

    // Initialize the map when the DOM is fully loaded
    initMap();

});